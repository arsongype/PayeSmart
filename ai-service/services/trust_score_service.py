from typing import Optional
from datetime import datetime

class TrustScoreService:
    BASE_SCORE = 50.0
    KYC_APPROVED_BONUS = 20.0
    KYB_APPROVED_BONUS = 15.0
    DOCUMENT_QUALITY_WEIGHT = 0.3
    FRAUD_PENALTY = -25.0
    ILIGIBLE_DOCUMENT_PENALTY = -15.0

    def calculate_kyc_impact(self, kyc_analysis: dict) -> float:
        if not kyc_analysis.get("is_valid", False):
            return self.ILIGIBLE_DOCUMENT_PENALTY
        confidence = kyc_analysis.get("confidence_score", 0.0)
        fraud_indicators = kyc_analysis.get("fraud_indicators", [])
        impact = confidence * self.DOCUMENT_QUALITY_WEIGHT * 100
        if fraud_indicators:
            impact += self.FRAUD_PENALTY
        return max(-50.0, min(50.0, impact))

    def calculate_kyb_impact(self, kyb_analysis: dict) -> float:
        if not kyb_analysis.get("is_valid", False):
            return self.ILIGIBLE_DOCUMENT_PENALTY
        confidence = kyb_analysis.get("confidence_score", 0.0)
        fraud_indicators = kyb_analysis.get("fraud_indicators", [])
        impact = confidence * self.DOCUMENT_QUALITY_WEIGHT * 100
        if fraud_indicators:
            impact += self.FRAUD_PENALTY
        return max(-50.0, min(50.0, impact))

    def get_user_trust_score(self, user_id: int) -> dict:
        return {
            "user_id": user_id,
            "trust_score": self.BASE_SCORE,
            "risk_level": "MEDIUM",
            "factors": {
                "kyc_status": "unknown",
                "kyb_status": "unknown",
                "documents_analyzed": 0,
                "fraud_indicators_count": 0,
            },
            "recommendation": "Complete KYC/KYB verification",
        }

    def recalculate_trust_score(self, user_id: int) -> dict:
        score = self.BASE_SCORE
        factors = {
            "kyc_status": "not_started",
            "kyb_status": "not_started",
            "documents_analyzed": 0,
            "fraud_indicators_count": 0,
        }
        recommendation = "Submit identity documents for verification"

        if factors["kyc_status"] == "APPROVED":
            score += self.KYC_APPROVED_BONUS
            recommendation = "KYC verified. Submit KYB documents if you are a merchant."

        if factors["kyb_status"] == "APPROVED":
            score += self.KYB_APPROVED_BONUS
            recommendation = "Fully verified. You have access to all features."

        if factors["fraud_indicators_count"] > 0:
            score += self.FRAUD_PENALTY * factors["fraud_indicators_count"]
            recommendation = "Manual review required due to fraud indicators."

        score = max(0.0, min(100.0, score))

        if score >= 80:
            risk_level = "LOW"
        elif score >= 50:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        return {
            "user_id": user_id,
            "trust_score": round(score, 2),
            "risk_level": risk_level,
            "factors": factors,
            "recommendation": recommendation,
        }
