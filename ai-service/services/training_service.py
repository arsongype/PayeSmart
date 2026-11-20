from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from services.fraud_ml_service import FraudMLService

logger = logging.getLogger(__name__)

try:
    import psycopg2
except ImportError:
    psycopg2 = None
DatabaseError = psycopg2.Error if psycopg2 is not None else RuntimeError


def _database_connection():
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required for database model training")

    ai_service_dir = Path(__file__).resolve().parents[1]
    repository_dir = ai_service_dir.parent
    load_dotenv(ai_service_dir / ".env")
    load_dotenv(repository_dir / "backend" / ".env", override=False)

    database_url = os.getenv("AI_DATABASE_URL") or os.getenv("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "paysmart_db"),
        user=os.getenv("DB_USERNAME", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )


def _metadata_value(metadata: Any, *names: str) -> Any:
    if not isinstance(metadata, dict):
        return None
    for name in names:
        if metadata.get(name) is not None:
            return metadata[name]
    return None


def load_labeled_transactions() -> list[dict[str, Any]]:
    """Load only explicit, reviewed administrator outcomes from PostgreSQL."""
    query = """
        SELECT
            t.id, t.amount, t.channel, t.metadata, t.created_at,
            sw.user_id, t.recipient_wallet_id, fa.fraud_outcome,
            (
                SELECT COUNT(*)
                FROM transactions previous_t
                WHERE previous_t.sender_wallet_id = t.sender_wallet_id
                  AND previous_t.created_at >= t.created_at - INTERVAL '24 hours'
                  AND previous_t.created_at <= t.created_at
            ) AS transaction_count_24h
        FROM fraud_alerts fa
        JOIN transactions t ON t.id = fa.transaction_id
        JOIN wallets sw ON sw.id = t.sender_wallet_id
        WHERE fa.fraud_outcome IN ('CONFIRMED_FRAUD', 'LEGITIMATE')
          AND fa.reviewed_at IS NOT NULL
        ORDER BY t.created_at ASC
    """
    try:
        with _database_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query)
                rows = cursor.fetchall()
    except DatabaseError as error:
        raise RuntimeError(f"Unable to read labeled transactions from PostgreSQL: {error}") from error

    samples = []
    for row in rows:
        transaction_id, amount, channel, metadata, created_at, user_id, recipient_wallet_id, outcome, count = row
        metadata = metadata if isinstance(metadata, dict) else {}
        created_hour = created_at.hour if isinstance(created_at, datetime) else 12
        hour = _metadata_value(metadata, "hour", "transaction_hour")
        samples.append({
            "id": transaction_id,
            "amount": float(amount),
            "channel": str(channel),
            "transaction_count_24h": int(_metadata_value(metadata, "transaction_count_24h") or count or 0),
            "device_id": _metadata_value(metadata, "device_id", "deviceId"),
            "ip_address": _metadata_value(metadata, "ip_address", "ipAddress"),
            "recipient_wallet_id": int(recipient_wallet_id) if recipient_wallet_id is not None else None,
            "user_id": int(user_id),
            "hour": int(hour) if hour is not None else created_hour,
            "is_fraud": outcome == "CONFIRMED_FRAUD",
        })
    return samples


def train_from_database(model: FraudMLService) -> dict[str, Any]:
    samples = load_labeled_transactions()
    labels = [1 if sample["is_fraud"] else 0 for sample in samples]
    if len(set(labels)) < 2:
        return {
            "status": "insufficient_labels",
            "samples": len(samples),
            "message": "At least one confirmed fraud and one legitimate verdict are required.",
        }

    features = [
        FraudMLService.build_features(
            sample["amount"], sample["channel"], sample["transaction_count_24h"],
            sample["device_id"], sample["ip_address"], sample["recipient_wallet_id"],
            sample["user_id"], sample["hour"],
        )
        for sample in samples
    ]
    result = model.retrain(features, labels, "postgresql:reviewed_fraud_outcomes")
    return {"status": "trained", **result}


def automatic_training(model: FraudMLService) -> dict[str, Any]:
    if os.getenv("AI_AUTO_TRAINING", "true").lower() not in {"1", "true", "yes"}:
        return {"status": "disabled"}
    try:
        return train_from_database(model)
    except (OSError, RuntimeError, ValueError) as error:
        logger.warning("Automatic fraud-model training was not completed: %s", error)
        return {"status": "unavailable", "message": str(error)}
