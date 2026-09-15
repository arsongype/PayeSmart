import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import FormData from 'form-data'
import { createReadStream } from 'node:fs'

export interface DocumentAnalysisResult {
  documentType: string
  is_valid: boolean
  confidenceScore: number
  extractedData: Record<string, any>
  fraudIndicators: string[]
  trustScoreImpact: number
  riskScore?: number
  riskLevel?: string
}

export interface TrustScoreResult {
  userId: number
  trustScore: number
  riskLevel: string
  factors: Record<string, any>
  recommendation: string
}

@Injectable()
export class AiService {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('aiService.url', 'http://localhost:8001')
    this.apiKey = this.configService.get<string>('aiService.apiKey', 'dev-secret-key-change-in-production')
  }

  private normalizeAnalysis(data: Record<string, any>): DocumentAnalysisResult {
    return {
      documentType: data.documentType ?? data.document_type,
      is_valid: data.is_valid ?? data.isValid ?? false,
      confidenceScore: data.confidenceScore ?? data.confidence_score ?? 0,
      extractedData: data.extractedData ?? data.extracted_data ?? {},
      fraudIndicators: data.fraudIndicators ?? data.fraud_indicators ?? [],
      trustScoreImpact: data.trustScoreImpact ?? data.trust_score_impact ?? 0,
      riskScore: data.riskScore ?? data.risk_score,
      riskLevel: data.riskLevel ?? data.risk_level,
    }
  }

  async analyzeKycDocument(
    userId: number,
    documentType: string,
    ocrText: string,
  ): Promise<DocumentAnalysisResult> {
    try {
      const response = await axios.post<DocumentAnalysisResult>(
        `${this.baseUrl}/api/v1/kyc/analyze`,
        { user_id: userId, document_type: documentType, ocr_text: ocrText },
        { headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' } },
      )
      return this.normalizeAnalysis(response.data as Record<string, any>)
    } catch (error) {
      console.error('Error analyzing KYC document:', error)
      throw new InternalServerErrorException('Failed to analyze KYC document')
    }
  }

  async analyzeKycFile(userId: number, documentType: string, file: Express.Multer.File) {
    const form = new FormData()
    form.append('user_id', String(userId))
    form.append('document_type', documentType)
    form.append('file', createReadStream(file.path), { filename: file.originalname, contentType: file.mimetype })
    const response = await axios.post(`${this.baseUrl}/api/v1/kyc/analyze-file`, form, {
      headers: { ...form.getHeaders(), 'X-API-Key': this.apiKey },
    })
    return this.normalizeAnalysis(response.data as Record<string, any>)
  }

  async analyzeKybDocument(
    userId: number,
    documentType: string,
    companyName?: string,
    sirenNif?: string,
    ocrText?: string,
  ): Promise<DocumentAnalysisResult> {
    try {
      const response = await axios.post<DocumentAnalysisResult>(
        `${this.baseUrl}/api/v1/kyb/analyze`,
        {
          user_id: userId,
          document_type: documentType,
          company_name: companyName,
          siren_nif: sirenNif,
          ocr_text: ocrText || '',
        },
        { headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' } },
      )
      return this.normalizeAnalysis(response.data as Record<string, any>)
    } catch (error) {
      console.error('Error analyzing KYB document:', error)
      throw new InternalServerErrorException('Failed to analyze KYB document')
    }
  }

  async analyzeKybFile(
    userId: number,
    documentType: string,
    file: Express.Multer.File,
    companyName?: string,
    sirenNif?: string,
  ) {
    const form = new FormData()
    form.append('user_id', String(userId))
    form.append('document_type', documentType)
    if (companyName) form.append('company_name', companyName)
    if (sirenNif) form.append('siren_nif', sirenNif)
    form.append('file', createReadStream(file.path), { filename: file.originalname, contentType: file.mimetype })
    const response = await axios.post(`${this.baseUrl}/api/v1/kyb/analyze-file`, form, {
      headers: { ...form.getHeaders(), 'X-API-Key': this.apiKey },
    })
    return this.normalizeAnalysis(response.data as Record<string, any>)
  }

  async getTrustScore(userId: number): Promise<TrustScoreResult> {
    try {
      const response = await axios.get<TrustScoreResult>(
        `${this.baseUrl}/api/v1/trust-score/${userId}`,
        { headers: { 'X-API-Key': this.apiKey } },
      )
      return response.data
    } catch (error) {
      console.error('Error getting trust score:', error)
      throw new InternalServerErrorException('Failed to get trust score')
    }
  }

  async recalculateTrustScore(userId: number): Promise<TrustScoreResult> {
    try {
      const response = await axios.post<TrustScoreResult>(
        `${this.baseUrl}/api/v1/trust-score/recalculate/${userId}`,
        {},
        { headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' } },
      )
      return response.data
    } catch (error) {
      console.error('Error recalculating trust score:', error)
      throw new InternalServerErrorException('Failed to recalculate trust score')
    }
  }
}
