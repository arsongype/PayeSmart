import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from services.model_evaluation_service import (
    FraudEvaluationSample,
    evaluate_labeled_samples,
    load_labeled_evaluation_dataset,
    resolve_evaluation_dataset,
)


class StubFraudModel:
    def __init__(self, scores: dict[int, float]) -> None:
        self.scores = scores

    def predict(self, user_id: int, **_features):
        return SimpleNamespace(risk_score=self.scores[user_id])


class ModelEvaluationServiceTests(unittest.TestCase):
    def test_computes_precision_recall_and_f1_from_labeled_predictions(self) -> None:
        samples = [
            FraudEvaluationSample(user_id=1, amount=10, channel="QR", is_fraud=True),
            FraudEvaluationSample(user_id=2, amount=10, channel="QR", is_fraud=True),
            FraudEvaluationSample(user_id=3, amount=10, channel="QR", is_fraud=False),
            FraudEvaluationSample(user_id=4, amount=10, channel="QR", is_fraud=False),
        ]
        model = StubFraudModel({1: 90, 2: 10, 3: 60, 4: 10})

        result = evaluate_labeled_samples(model, samples)

        self.assertEqual(result, {"precision": 0.5, "recall": 0.5, "f1Score": 0.5})

    def test_development_without_a_dataset_reports_unconfigured_metrics(self) -> None:
        samples, source = resolve_evaluation_dataset(None)

        self.assertEqual(samples, [])
        self.assertEqual(source, "unconfigured")

    def test_production_without_a_dataset_reports_unconfigured_metrics(self) -> None:
        samples, source = resolve_evaluation_dataset(None)

        self.assertEqual(samples, [])
        self.assertEqual(source, "unconfigured")

    def test_loads_anonymized_labeled_csv(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "evaluation.csv"
            path.write_text(
                "is_fraud,amount,channel,user_id\nfalse,15,QR,1\ntrue,2500,CARD,2\n",
                encoding="utf-8",
            )

            samples = load_labeled_evaluation_dataset(path)

        self.assertEqual([sample.is_fraud for sample in samples], [False, True])

if __name__ == "__main__":
    unittest.main()
