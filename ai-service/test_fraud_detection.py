import unittest

from services.fraud_detection_service import FraudDetectionService


class FraudDetectionServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = FraudDetectionService()

    def test_normal_transaction_is_approved(self) -> None:
        result = self.service.predict(1, 50, "CARD")
        self.assertEqual(result.decision, "APPROVE")
        self.assertEqual(result.risk_level, "LOW")
        self.assertLess(result.risk_score, 40.0)

    def test_unusual_transaction_requires_two_factor(self) -> None:
        result = self.service.predict(1, 1500, "CARD", transaction_count_24h=8, hour=23)
        self.assertEqual(result.decision, "REQUIRE_2FA")
        self.assertEqual(result.risk_level, "MEDIUM")
        self.assertIn("Montant élevé", " ".join(result.reasons))

    def test_high_risk_transaction_is_blocked(self) -> None:
        result = self.service.predict(
            1,
            5000,
            "BANK_TRANSFER",
            transaction_count_24h=20,
            device_id="unknown-device",
            ip_address="0.0.0.0",
            recipient_wallet_id=1,
            hour=2,
        )
        self.assertEqual(result.decision, "BLOCK")
        self.assertEqual(result.risk_level, "HIGH")
        self.assertGreaterEqual(result.risk_score, 90.0)

    def test_ensemble_models_are_supported(self) -> None:
        for model_name in ("random_forest", "xgboost"):
            with self.subTest(model=model_name):
                model = FraudDetectionService(model_type=model_name)
                result = model.predict(1, 3000, "CARD", transaction_count_24h=7, hour=23)
                self.assertIn(result.decision, {"APPROVE", "REQUIRE_2FA", "BLOCK"})
                self.assertGreaterEqual(result.risk_score, 0.0)
                self.assertLessEqual(result.risk_score, 100.0)


if __name__ == "__main__":
    unittest.main()