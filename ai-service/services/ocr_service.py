import re
import os
import shutil
from typing import Optional
from dataclasses import dataclass

@dataclass
class KYCAnalysisResult:
    document_type: str
    is_valid: bool
    confidence_score: float
    extracted_data: dict
    fraud_indicators: list[str]
    trust_score_impact: float

@dataclass
class KYBAnalysisResult:
    document_type: str
    is_valid: bool
    confidence_score: float
    extracted_data: dict
    fraud_indicators: list[str]
    trust_score_impact: float

class OCRService:
    def __init__(self) -> None:
        try:
            import pytesseract
            executable = shutil.which("tesseract")
            for candidate in (
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ):
                if not executable and os.path.exists(candidate):
                    executable = candidate
                    break
            if executable:
                pytesseract.pytesseract.tesseract_cmd = executable
        except ImportError:
            pass

    def _is_valid_siren(self, value: str) -> bool:
        digits = re.sub(r"\D", "", value)
        if len(digits) != 9 or len(set(digits)) == 1:
            return False
        total = 0
        for index, digit in enumerate(reversed(digits)):
            number = int(digit)
            if index % 2 == 1:
                number *= 2
                if number > 9:
                    number -= 9
            total += number
        return total % 10 == 0

    def _risk(self, confidence: float, fraud_indicators: list[str]) -> tuple[float, str]:
        risk_score = max(0.0, min(100.0, (1 - confidence) * 100 + len(fraud_indicators) * 15))
        risk_level = "LOW" if risk_score < 30 else "MEDIUM" if risk_score < 60 else "HIGH"
        return round(risk_score, 2), risk_level

    def extract_text(self, file_path: str) -> str:
        try:
            import pytesseract
            from PIL import Image
            if file_path.lower().endswith(".pdf"):
                from pdf2image import convert_from_path
                pages = convert_from_path(file_path, first_page=1, last_page=3, dpi=200)
                return "\n".join(pytesseract.image_to_string(page, lang="fra+eng") for page in pages).strip()
            return pytesseract.image_to_string(Image.open(file_path), lang="fra+eng").strip()
        except Exception as error:
            print(f"OCR unavailable: {error}")
            return ""

    def analyze_kyc_document(self, document_type: str, ocr_text: str) -> dict:
        extracted_data: dict = {}
        fraud_indicators: list[str] = []
        confidence = 0.75
        is_valid = True

        if not ocr_text or len(ocr_text.strip()) < 10:
            fraud_indicators.append("Document_illegible")
            confidence -= 0.4
            is_valid = False

        if document_type in ["CIN", "PASSPORT"]:
            id_match = re.search(r"\b\d{8,12}\b", ocr_text)
            if id_match:
                extracted_data["id_number"] = id_match.group()
            else:
                fraud_indicators.append("ID_Number_Not_Found")
                confidence -= 0.2

            name_patterns = [
                r"(?:Nom|Name|NOM)[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+){1,3})",
                r"\b([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\b",
            ]
            for pattern in name_patterns:
                match = re.search(pattern, ocr_text, re.IGNORECASE)
                if match:
                    extracted_data["name"] = match.group(1)
                    break

            date_patterns = [
                r"\b(\d{2}[./]\d{2}[./]\d{4})\b",
                r"\b(\d{4}-\d{2}-\d{2})\b",
            ]
            for pattern in date_patterns:
                match = re.search(pattern, ocr_text)
                if match:
                    extracted_data["expiry_date"] = match.group(1)
                    break

        confidence = max(0.1, min(1.0, confidence))

        risk_score, risk_level = self._risk(confidence, fraud_indicators)
        return {
            "document_type": document_type,
            "is_valid": is_valid,
            "confidence_score": confidence,
            "extracted_data": extracted_data,
            "fraud_indicators": fraud_indicators,
            "risk_score": risk_score,
            "risk_level": risk_level,
        }

    def analyze_kyb_document(
        self,
        document_type: str,
        company_name: Optional[str] = None,
        siren_nif: Optional[str] = None,
        ocr_text: str = "",
    ) -> dict:
        extracted_data: dict = {}
        fraud_indicators: list[str] = []
        confidence = 0.75
        is_valid = True

        if not ocr_text or len(ocr_text.strip()) < 10:
            fraud_indicators.append("Document_illegible")
            confidence -= 0.4
            is_valid = False

        if document_type in ["KBIS", "NIF"]:
            if siren_nif:
                extracted_data["siren_nif"] = siren_nif
            else:
                siren_match = re.search(r"\b\d{9,14}\b", ocr_text)
                if siren_match:
                    extracted_data["siren_nif"] = siren_match.group()
                else:
                    fraud_indicators.append("SIREN_NIF_Not_Found")
                    confidence -= 0.2

            if "siren_nif" in extracted_data:
                identifier = str(extracted_data["siren_nif"])
                digits = re.sub(r"\D", "", identifier)
                is_valid_identifier = self._is_valid_siren(identifier) if len(digits) == 9 else bool(re.fullmatch(r"\d{14}", digits))
                extracted_data["siren_nif_valid"] = is_valid_identifier
                if not is_valid_identifier:
                    fraud_indicators.append("SIREN_NIF_Invalid")
                    confidence -= 0.25

            if company_name:
                extracted_data["company_name"] = company_name
            else:
                company_match = re.search(
                    r"(?:Société|Company|Entreprise)[:\s]+([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+){1,4})",
                    ocr_text,
                    re.IGNORECASE,
                )
                if company_match:
                    extracted_data["company_name"] = company_match.group(1)

            address_match = re.search(
                r"(?:Adresse|Address|Siège)[:\s]+([\d\w\s,]+(?:\s+\d{5})?)",
                ocr_text,
                re.IGNORECASE,
            )
            if address_match:
                extracted_data["address"] = address_match.group(1)

        elif document_type == "RIB":
            iban_match = re.search(r"\b[A-Z]{2}\d{2}(?:[ ]?\d{4}){4,6}\b", ocr_text)
            if iban_match:
                extracted_data["iban"] = iban_match.group()
            else:
                fraud_indicators.append("IBAN_Not_Found")
                confidence -= 0.15

            bic_match = re.search(r"\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b", ocr_text)
            if bic_match:
                extracted_data["bic"] = bic_match.group()

        confidence = max(0.1, min(1.0, confidence))

        risk_score, risk_level = self._risk(confidence, fraud_indicators)
        return {
            "document_type": document_type,
            "is_valid": is_valid,
            "confidence_score": confidence,
            "extracted_data": extracted_data,
            "fraud_indicators": fraud_indicators,
            "risk_score": risk_score,
            "risk_level": risk_level,
        }
