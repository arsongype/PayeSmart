from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import uuid
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

API_KEY = os.getenv("AI_API_KEY", "dev-secret-key")
ocr_service = OCRService()
trust_score_service = TrustScoreService()

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
    return {"status": "healthy", "service": "ai-service", "version": "1.0.0"}

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
        temp_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
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
        os.remove(temp_path)
        return DocumentAnalysisResponse(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        temp_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
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
        os.remove(temp_path)
        return DocumentAnalysisResponse(**analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
