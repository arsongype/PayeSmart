import csv
import json
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from services.fraud_detection_service import FraudDetectionService

FRAUD_SCORE_THRESHOLD = 40.0
class FraudEvaluationSample(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    is_fraud: bool
    amount: float = Field(ge=0, allow_inf_nan=False)
    channel: str = Field(min_length=1)
    user_id: int = 0
    transaction_count_24h: int = Field(default=0, ge=0)
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    recipient_wallet_id: Optional[int] = None
    hour: Optional[int] = Field(default=None, ge=0, le=23)


def load_labeled_evaluation_dataset(path: Path) -> list[FraudEvaluationSample]:
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as dataset_file:
            records = [
                {key: value for key, value in row.items() if key and value and value.strip()}
                for row in csv.DictReader(dataset_file)
            ]
    elif path.suffix.lower() == ".jsonl":
        records = [
            json.loads(line)
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
    elif path.suffix.lower() == ".json":
        records = json.loads(path.read_text(encoding="utf-8"))
    else:
        raise ValueError("Evaluation dataset must use CSV, JSON, or JSONL format")

    if not isinstance(records, list) or not records:
        raise ValueError("Evaluation dataset must contain at least one labeled sample")

    samples = []
    for row_number, record in enumerate(records, start=1):
        try:
            samples.append(FraudEvaluationSample.model_validate(record))
        except ValidationError as error:
            first_error = error.errors(include_input=False)[0]
            raise ValueError(
                f"Invalid evaluation sample on row {row_number}: {first_error['msg']}"
            ) from error

    if {sample.is_fraud for sample in samples} != {False, True}:
        raise ValueError("Evaluation dataset must contain both fraud and non-fraud labels")
    return samples


def resolve_evaluation_dataset(
    configured_path: Optional[str],
) -> tuple[list[FraudEvaluationSample], str]:
    if not configured_path:
        return [], "unconfigured"

    path = Path(configured_path).expanduser()
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[1] / path
    return load_labeled_evaluation_dataset(path), "labeled_dataset"


def evaluate_labeled_samples(
    model: FraudDetectionService,
    samples: list[FraudEvaluationSample],
) -> dict[str, float]:
    true_positives = 0
    false_positives = 0
    false_negatives = 0

    for sample in samples:
        prediction = model.predict(
            user_id=sample.user_id,
            amount=sample.amount,
            channel=sample.channel,
            transaction_count_24h=sample.transaction_count_24h,
            device_id=sample.device_id,
            ip_address=sample.ip_address,
            recipient_wallet_id=sample.recipient_wallet_id,
            hour=sample.hour,
        )
        predicted_fraud = prediction.risk_score >= FRAUD_SCORE_THRESHOLD
        if predicted_fraud and sample.is_fraud:
            true_positives += 1
        elif predicted_fraud:
            false_positives += 1
        elif sample.is_fraud:
            false_negatives += 1

    precision = true_positives / (true_positives + false_positives) if true_positives + false_positives else 0
    recall = true_positives / (true_positives + false_negatives) if true_positives + false_negatives else 0
    f1_score = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1Score": round(f1_score, 4),
    }
