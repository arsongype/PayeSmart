from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import Optional
import os
import socket
import tempfile
import uuid
from urllib.request import urlopen
from dotenv import load_dotenv

from services.ocr_service import OCRService
from services.trust_score_service import TrustScoreService
from services.fraud_detection_service import FraudDetectionService
from services.model_evaluation_service import evaluate_labeled_samples, resolve_evaluation_dataset

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

API_KEY = os.getenv("AI_API_KEY", "local-development-ai-key")
if (os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production") and (
    len(API_KEY) < 32 or API_KEY.startswith(("replace-with", "your-", "dev-"))
):
    raise RuntimeError("AI_API_KEY must be configured with a random value of at least 32 characters in production")
ocr_service = OCRService()
trust_score_service = TrustScoreService()
fraud_detection_service = FraudDetectionService()
fraud_metrics = {
    "analyzed_transactions": 0,
    "predicted_fraud": 0,
}
evaluation_samples, evaluation_source = resolve_evaluation_dataset(
    os.getenv("AI_EVALUATION_DATASET"),
)
evaluation_metrics = evaluate_labeled_samples(fraud_detection_service, evaluation_samples) if evaluation_samples else {
    "precision": None,
    "recall": None,
    "f1Score": None,
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
    amount: float = Field(description="Transaction debit amount normalized to EUR for risk scoring")
    channel: str
    transaction_count_24h: int = 0
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    recipient_wallet_id: Optional[int] = None
    hour: Optional[int] = None
    low_risk_threshold: float = Field(default=30.0, ge=0, le=100)
    medium_risk_threshold: float = Field(default=70.0, ge=0, le=100)

    @model_validator(mode="after")
    def validate_risk_thresholds(self):
        if self.low_risk_threshold >= self.medium_risk_threshold:
            raise ValueError("low_risk_threshold must be lower than medium_risk_threshold")
        return self

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
    """Return model counters and metrics computed from a labeled evaluation dataset."""
    return {
        **evaluation_metrics,
        "metricSource": evaluation_source,
        "evaluationSamples": len(evaluation_samples),
        "fraudThreshold": 40,
        "analyzedTransactions": fraud_metrics["analyzed_transactions"],
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
    user_id: int = Form(...),
    document_type: str = Form(...),
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
    user_id: int = Form(...),
    document_type: str = Form(...),
    company_name: Optional[str] = Form(None),
    siren_nif: Optional[str] = Form(None),
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
        prediction = fraud_detection_service.predict(
            user_id=request.user_id,
            amount=request.amount,
            channel=request.channel,
            transaction_count_24h=request.transaction_count_24h,
            device_id=request.device_id,
            ip_address=request.ip_address,
            recipient_wallet_id=request.recipient_wallet_id,
            hour=request.hour,
            low_risk_threshold=request.low_risk_threshold,
            medium_risk_threshold=request.medium_risk_threshold,
        )
        fraud_metrics["analyzed_transactions"] += 1
        if prediction.risk_score >= 40:
            fraud_metrics["predicted_fraud"] += 1

        return FraudDetectionResponse(
            user_id=request.user_id,
            risk_score=prediction.risk_score,
            risk_level=prediction.risk_level,
            decision=prediction.decision,
            reasons=prediction.reasons,
            features=prediction.features,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8120))
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
