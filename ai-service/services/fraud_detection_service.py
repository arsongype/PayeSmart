from dataclasses import dataclass
from typing import Optional

from services.fraud_ml_service import FraudMLService
from services.ensemble_fraud_model import EnsembleFraudModel


@dataclass
class FraudPrediction:
    risk_score: float
    risk_level: str
    decision: str
    reasons: list[str]
    features: dict


def evaluate_risk_decision(risk_score: float, low_threshold: float = 30.0, medium_threshold: float = 70.0) -> tuple[str, str]:
    if risk_score < low_threshold:
        return "APPROVE", "LOW"
    if risk_score < medium_threshold:
        return "REQUIRE_2FA", "MEDIUM"
    return "BLOCK", "HIGH"


class FraudDetectionService:
    """Risk decisions use EUR-normalized amounts with the baseline model's EUR-scale thresholds."""

    def __init__(self, model_type: str = "logistic_regression") -> None:
        self.model_type = model_type.lower()
        if self.model_type == "logistic_regression":
            self.model = FraudMLService()
        elif self.model_type in {"random_forest", "xgboost"}:
            self.model = EnsembleFraudModel(model_type=self.model_type)
        else:
            self.model = FraudMLService()

    def predict(
        self,
        user_id: int,
        amount: float,
        channel: str,
        transaction_count_24h: int = 0,
        device_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        recipient_wallet_id: Optional[int] = None,
        hour: Optional[int] = None,
        low_risk_threshold: float = 30.0,
        medium_risk_threshold: float = 70.0,
    ) -> FraudPrediction:
        normalized_amount = max(0.0, float(amount or 0))
        transaction_count = max(0, int(transaction_count_24h or 0))
        transaction_hour = hour if hour is not None else 12
        reasons: list[str] = []
        prediction = self.model.predict(
            amount=normalized_amount,
            channel=channel,
            transaction_count_24h=transaction_count,
            device_id=device_id,
            ip_address=ip_address,
            recipient_wallet_id=recipient_wallet_id,
            user_id=user_id,
            hour=transaction_hour,
        )

        if normalized_amount >= 5000:
            reasons.append("Montant très élevé pour une transaction courante.")
        elif normalized_amount >= 1500:
            reasons.append("Montant élevé pour l'historique du compte.")

        if transaction_count >= 20:
            reasons.append("Activité de transaction anormalement élevée.")
        elif transaction_count >= 8:
            reasons.append("Nombre important de transactions en 24 heures.")

        if transaction_hour < 4 or transaction_hour >= 23:
            reasons.append("Transaction effectuée hors des heures usuelles.")

        if device_id and device_id.startswith("unknown"):
            reasons.append("Appareil non reconnu.")
        if ip_address and ip_address.startswith("0.0.0.0"):
            reasons.append("Adresse IP inhabituelle.")
        if recipient_wallet_id is not None and recipient_wallet_id == user_id:
            reasons.append("Le portefeuille destinataire est identique à l'émetteur.")

        risk_score = round(prediction.probability * 100, 2)
        decision, risk_level = evaluate_risk_decision(
            risk_score,
            low_risk_threshold,
            medium_risk_threshold,
        )

        if not reasons:
            if decision == "APPROVE":
                reasons.append(f"Risque faible : montant de {normalized_amount:.2f} et activité habituelle, validation automatique.")
            elif decision == "REQUIRE_2FA":
                reasons.append(f"Risque intermédiaire : score de {risk_score:.1f}/100, confirmation OTP requise.")
            else:
                reasons.append(f"Risque élevé : score de {risk_score:.1f}/100, transaction bloquée pour vérification.")

        return FraudPrediction(
            risk_score=risk_score,
            risk_level=risk_level,
            decision=decision,
            reasons=reasons[:3],
            features={
                "amount": normalized_amount,
                "channel": channel,
                "transaction_count_24h": transaction_count,
                "hour": transaction_hour,
                "device_id": device_id,
                "ip_address": ip_address,
                "recipient_wallet_id": recipient_wallet_id,
                **prediction.features,
                "model": getattr(prediction, "model_type", "logistic-regression-v1"),
            },
        )