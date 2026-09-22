from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

try:
    from sklearn.ensemble import RandomForestClassifier
except Exception:
    RandomForestClassifier = None

try:
    import xgboost as xgb
except Exception:
    xgb = None


@dataclass
class EnsemblePrediction:
    probability: float
    model_type: str
    features: dict[str, float]


class EnsembleFraudModel:
    """Random Forest and XGBoost alternatives for transaction fraud detection."""

    feature_names = (
        "amount_risk",
        "frequency_risk",
        "night_risk",
        "channel_risk",
        "unknown_device",
        "unusual_ip",
        "self_recipient",
    )

    def __init__(self, model_type: str = "random_forest", model_path: Optional[str] = None):
        self.model_type = model_type.lower()
        self.model_path = Path(model_path) if model_path else Path(__file__).resolve().parents[1] / "models" / f"{self.model_type}_fraud_model.joblib"
        self.model = self._load_or_train()

    def _load_or_train(self):
        if self.model_type == "xgboost":
            if xgb is None:
                raise ImportError("xgboost is not installed. Install it via pip install xgboost")
            return self._train_xgboost()
        if RandomForestClassifier is None:
            raise ImportError("scikit-learn is not installed. Install it via pip install scikit-learn")
        return self._train_random_forest()

    def _train_random_forest(self):
        X = np.array([
            [0.00, 0.00, 0, 0, 0, 0, 0],
            [0.05, 0.00, 0, 0, 0, 0, 0],
            [0.20, 0.15, 0, 1, 0, 0, 0],
            [0.35, 0.40, 1, 1, 0, 0, 0],
            [0.50, 0.40, 0, 1, 1, 0, 0],
            [0.75, 0.80, 1, 1, 1, 1, 0],
            [1.00, 1.00, 1, 1, 1, 1, 1],
            [0.90, 0.20, 0, 0, 0, 1, 0],
            [0.10, 0.90, 0, 0, 0, 0, 0],
            [0.20, 0.10, 1, 0, 0, 0, 1],
        ], dtype=float)
        y = np.array([0, 0, 0, 1, 1, 1, 1, 1, 0, 1], dtype=int)
        model = RandomForestClassifier(n_estimators=200, random_state=42, max_depth=5)
        model.fit(X, y)
        return model

    def _train_xgboost(self):
        X = np.array([
            [0.00, 0.00, 0, 0, 0, 0, 0],
            [0.05, 0.00, 0, 0, 0, 0, 0],
            [0.20, 0.15, 0, 1, 0, 0, 0],
            [0.35, 0.40, 1, 1, 0, 0, 0],
            [0.50, 0.40, 0, 1, 1, 0, 0],
            [0.75, 0.80, 1, 1, 1, 1, 0],
            [1.00, 1.00, 1, 1, 1, 1, 1],
            [0.90, 0.20, 0, 0, 0, 1, 0],
            [0.10, 0.90, 0, 0, 0, 0, 0],
            [0.20, 0.10, 1, 0, 0, 0, 1],
        ], dtype=float)
        y = np.array([0, 0, 0, 1, 1, 1, 1, 1, 0, 1], dtype=int)
        model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.1,
            objective='binary:logistic',
            random_state=42,
            eval_metric='logloss',
        )
        model.fit(X, y)
        return model

    def predict(self, amount: float, channel: str, transaction_count_24h: int, device_id: Optional[str], ip_address: Optional[str], recipient_wallet_id: Optional[int], user_id: int, hour: Optional[int]) -> EnsemblePrediction:
        values = np.array([
            min(max(float(amount or 0), 0.0) / 5000, 1.0),
            min(max(int(transaction_count_24h or 0), 0) / 20, 1.0),
            1.0 if hour is not None and (hour < 4 or hour >= 23) else 0.0,
            1.0 if channel in {"CARD", "BANK_TRANSFER"} else 0.0,
            1.0 if device_id and device_id.startswith("unknown") else 0.0,
            1.0 if ip_address and ip_address.startswith("0.0.0.0") else 0.0,
            1.0 if recipient_wallet_id is not None and recipient_wallet_id == user_id else 0.0,
        ], dtype=float).reshape(1, -1)

        probability = float(self.model.predict_proba(values)[0, 1])
        return EnsemblePrediction(
            probability=probability,
            model_type=self.model_type,
            features=dict(zip(self.feature_names, values[0].tolist())),
        )
