from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import socket
import tempfile
import uuid
from urllib.request import urlopen
from dotenv import load_dotenv

from services.ocr_service import OCRService
from services.trust_score_service import TrustScoreService

load_dotenv()

app = FastAPI(
    title="Paysmart AI Service",
    description="Service IA pour l'analyse de documents KYC/KYB et le scoring de confiance",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("AI_API_KEY", "dev-secret-key-change-in-production")
ocr_service = OCRService()
trust_score_service = TrustScoreService()
fraud_metrics = {
    "analyzed_transactions": 0,
    "predicted_fraud": 0,
}

class KYCAnalysisRequest(BaseModel):
    user_id: int
    document_type: str
    ocr_text: Optional[str] = None

class KYBAnalysisRequest(BaseModel):
    user_id: int
    document_type: str
    company_name: Optional[str] = None
    siren_nif: Optional[str] = None
    ocr_text: Optional[str] = None

class FraudDetectionRequest(BaseModel):
    user_id: int
    amount: float
    channel: str
    transaction_count_24h: int = 0
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    recipient_wallet_id: Optional[int] = None
    hour: Optional[int] = None

class FraudDetectionResponse(BaseModel):
    user_id: int
    risk_score: float
    risk_level: str
    decision: str
    reasons: list[str]
    features: dict

class TrustScoreResponse(BaseModel):
    user_id: int
    trust_score: float
    risk_level: str
    factors: dict
    recommendation: str

class DocumentAnalysisResponse(BaseModel):
    document_type: str
    is_valid: bool
    confidence_score: float
    extracted_data: dict
    fraud_indicators: list[str]
    trust_score_impact: float
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "ocr_available": ocr_service.is_available(),
    }

@app.get("/api/v1/metrics", dependencies=[Depends(verify_api_key)])
async def get_metrics():
    """Return model counters and configured evaluation metrics for reporting."""
    analyzed = fraud_metrics["analyzed_transactions"]
    configured_precision = os.getenv("AI_MODEL_PRECISION")
    configured_recall = os.getenv("AI_MODEL_RECALL")
    precision = float(configured_precision) if configured_precision else None
    recall = float(configured_recall) if configured_recall else None
    f1_score = None
    if precision is not None and recall is not None and precision + recall > 0:
        f1_score = round((2 * precision * recall) / (precision + recall), 4)
    return {
        "precision": precision,
        "recall": recall,
        "f1Score": f1_score,
        "analyzedTransactions": analyzed,
        "predictedFraud": fraud_metrics["predicted_fraud"],
    }

@app.post("/api/v1/kyc/analyze", response_model=DocumentAnalysisResponse, dependencies=[Depends(verify_api_key)])
async def analyze_kyc_document(request: KYCAnalysisRequest):
    try:
        ocr_text = request.ocr_text or ""
        analysis = ocr_service.analyze_kyc_document(
            document_type=request.document_type,
            ocr_text=ocr_text
        )
        trust_impact = trust_score_service.calculate_kyc_impact(analysis)
        analysis["trust_score_impact"] = trust_impact
        return DocumentAnalysisResponse(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/kyc/analyze-file", response_model=DocumentAnalysisResponse, dependencies=[Depends(verify_api_key)])
async def analyze_kyc_file(
    user_id: int,
    document_type: str,
    file: UploadFile = File(...)
):
    try:
        temp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}_{file.filename}")
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        ocr_text = ocr_service.extract_text(temp_path)
        analysis = ocr_service.analyze_kyc_document(
            document_type=document_type,
            ocr_text=ocr_text
        )
        trust_impact = trust_score_service.calculate_kyc_impact(analysis)
        analysis["trust_score_impact"] = trust_impact
        return DocumentAnalysisResponse(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/v1/kyb/analyze", response_model=DocumentAnalysisResponse, dependencies=[Depends(verify_api_key)])
async def analyze_kyb_document(request: KYBAnalysisRequest):
    try:
        ocr_text = request.ocr_text or ""
        analysis = ocr_service.analyze_kyb_document(
            document_type=request.document_type,
            company_name=request.company_name,
            siren_nif=request.siren_nif,
            ocr_text=ocr_text
        )
        trust_impact = trust_score_service.calculate_kyb_impact(analysis)
        analysis["trust_score_impact"] = trust_impact
        return DocumentAnalysisResponse(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/kyb/analyze-file", response_model=DocumentAnalysisResponse, dependencies=[Depends(verify_api_key)])
async def analyze_kyb_file(
    user_id: int,
    document_type: str,
    company_name: Optional[str] = None,
    siren_nif: Optional[str] = None,
    file: UploadFile = File(...)
):
    try:
        temp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}_{file.filename}")
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        ocr_text = ocr_service.extract_text(temp_path)
        analysis = ocr_service.analyze_kyb_document(
            document_type=document_type,
            company_name=company_name,
            siren_nif=siren_nif,
            ocr_text=ocr_text
        )
        trust_impact = trust_score_service.calculate_kyb_impact(analysis)
        analysis["trust_score_impact"] = trust_impact
        return DocumentAnalysisResponse(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/api/v1/trust-score/{user_id}", response_model=TrustScoreResponse, dependencies=[Depends(verify_api_key)])
async def get_trust_score(user_id: int):
    try:
        score_data = trust_score_service.get_user_trust_score(user_id)
        return TrustScoreResponse(**score_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/trust-score/recalculate/{user_id}", response_model=TrustScoreResponse, dependencies=[Depends(verify_api_key)])
async def recalculate_trust_score(user_id: int):
    try:
        score_data = trust_score_service.recalculate_trust_score(user_id)
        return TrustScoreResponse(**score_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/fraud-detection/predict", response_model=FraudDetectionResponse, dependencies=[Depends(verify_api_key)])
async def predict_fraud_risk(request: FraudDetectionRequest):
    try:
        amount = float(request.amount or 0)
        score = 12.0

        if amount >= 5000:
            score += 28
        elif amount >= 1500:
            score += 18
        elif amount >= 500:
            score += 10

        if request.transaction_count_24h >= 20:
            score += 20
        elif request.transaction_count_24h >= 8:
            score += 12
        elif request.transaction_count_24h >= 3:
            score += 6

        hour = request.hour if request.hour is not None else 12
        if hour < 4 or hour >= 23:
            score += 14

        if request.channel in {"CARD", "BANK_TRANSFER"}:
            score += 8
        elif request.channel in {"MVOLA", "ORANGE_MONEY", "AIRTEL_MONEY"}:
            score += 4

        if request.device_id and request.device_id.startswith("unknown"):
            score += 10
        if request.ip_address and request.ip_address.startswith("0.0.0.0"):
            score += 8

        if request.recipient_wallet_id is not None and request.recipient_wallet_id == request.user_id:
            score += 16

        risk_score = max(0.0, min(100.0, round(score, 2)))
        fraud_metrics["analyzed_transactions"] += 1
        if risk_score >= 40:
            fraud_metrics["predicted_fraud"] += 1
        if risk_score < 40:
            decision = "APPROVE"
            risk_level = "LOW"
            reasons = ["Aucun motif de fraude majeur détecté."]
        elif risk_score < 75:
            decision = "REQUIRE_2FA"
            risk_level = "MEDIUM"
            reasons = ["Transaction inhabituelle pour ce profil utilisateur."]
        else:
            decision = "BLOCK"
            risk_level = "HIGH"
            reasons = ["Risque élevé détecté, transaction bloquée automatiquement."]

        if amount >= 10000:
            reasons.append("Montant élevé pour l'historique du compte.")
        if request.transaction_count_24h >= 10:
            reasons.append("Activité de transaction anormalement élevée.")
        if hour < 4 or hour >= 23:
            reasons.append("Transaction effectuée hors des heures usuelles.")

        return FraudDetectionResponse(
            user_id=request.user_id,
            risk_score=risk_score,
            risk_level=risk_level,
            decision=decision,
            reasons=reasons[:3],
            features={
                "amount": amount,
                "channel": request.channel,
                "transaction_count_24h": request.transaction_count_24h,
                "hour": hour,
                "device_id": request.device_id,
                "ip_address": request.ip_address,
                "recipient_wallet_id": request.recipient_wallet_id,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8101))
    host = os.getenv("HOST", "0.0.0.0")

    try:
        with urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as response:
            if response.status == 200:
                print(f"Le service IA fonctionne déjà sur http://localhost:{port}")
                raise SystemExit(0)
    except Exception:
        pass

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        port_in_use = probe.connect_ex(("127.0.0.1", port)) == 0
    if port_in_use:
        raise SystemExit(f"Le port {port} est déjà utilisé par un autre processus. Fermez-le ou choisissez un autre PORT.")

    print(f"Démarrage du service IA sur http://localhost:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
