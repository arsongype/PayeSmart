from dataclasses import dataclass
from pathlib import Path
import pickle
from typing import Optional

import numpy as np

try:
    import joblib
except ImportError:
    joblib = None


@dataclass
class MLPrediction:
    probability: float
    features: dict[str, float]


class FraudMLService:
    """Local logistic-regression model persisted with Joblib."""

    feature_names = (
        "amount_risk",
        "frequency_risk",
        "night_risk",
        "channel_risk",
        "unknown_device",
        "unusual_ip",
        "self_recipient",
    )

    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = Path(model_path) if model_path else Path(__file__).resolve().parents[1] / "models" / "fraud_logistic_regression.joblib"
        loaded_model = self._load()
        if loaded_model is None:
            self.weights, self.bias = self._train()
            self._save()
        else:
            self.weights, self.bias = loaded_model

    def _load(self) -> Optional[tuple[np.ndarray, float]]:
        try:
            model = joblib.load(self.model_path) if joblib else pickle.loads(self.model_path.read_bytes())
            weights = np.asarray(model["weights"], dtype=float)
            bias = float(model["bias"])
            if weights.shape != (len(self.feature_names),):
                return None
            return weights, bias
        except (FileNotFoundError, KeyError, TypeError, ValueError, OSError):
            return None

    def _save(self) -> None:
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        model = {"weights": self.weights, "bias": self.bias, "features": self.feature_names}
        if joblib:
            joblib.dump(model, self.model_path)
        else:
            self.model_path.write_bytes(pickle.dumps(model))

    def _train(self) -> tuple[np.ndarray, float]:
        # Baseline examples are replaced by real labeled transactions when available.
        samples = np.array([
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
        labels = np.array([0, 0, 0, 1, 1, 1, 1, 1, 0, 1], dtype=float)
        weights = np.zeros(samples.shape[1], dtype=float)
        bias = 0.0
        for _ in range(2500):
            probabilities = self._sigmoid(samples @ weights + bias)
            error = probabilities - labels
            weights -= 0.25 * (samples.T @ error / len(samples) + 0.01 * weights)
            bias -= 0.25 * float(error.mean())
        return weights, float(bias)

    @staticmethod
    def _sigmoid(value: np.ndarray | float) -> np.ndarray | float:
        return 1 / (1 + np.exp(-np.clip(value, -30, 30)))

    def predict(
        self,
        amount: float,
        channel: str,
        transaction_count_24h: int,
        device_id: Optional[str],
        ip_address: Optional[str],
        recipient_wallet_id: Optional[int],
        user_id: int,
        hour: Optional[int],
    ) -> MLPrediction:
        values = np.array([
            min(max(float(amount or 0), 0.0) / 5000, 1.0),
            min(max(int(transaction_count_24h or 0), 0) / 20, 1.0),
            1.0 if hour is not None and (hour < 4 or hour >= 23) else 0.0,
            1.0 if channel in {"CARD", "BANK_TRANSFER"} else 0.0,
            1.0 if device_id and device_id.startswith("unknown") else 0.0,
            1.0 if ip_address and ip_address.startswith("0.0.0.0") else 0.0,
            1.0 if recipient_wallet_id is not None and recipient_wallet_id == user_id else 0.0,
        ], dtype=float)
        probability = float(self._sigmoid(float(values @ self.weights + self.bias)))
        return MLPrediction(probability=probability, features=dict(zip(self.feature_names, values.tolist())))