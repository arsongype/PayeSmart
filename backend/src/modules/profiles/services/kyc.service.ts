import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { KycDocument } from '../../auth/entities/kyc-document.entity.js'
import { CreateKycDocumentDto, ReviewKycDocumentDto } from '../../auth/dto/kyc.dto.js'
import { AiService } from './ai.service.js'
import { User } from '../../auth/entities/user.entity.js'
import { KycStatus } from '../../auth/enums/kyc-status.enum.js'
import { NotificationService } from '../../../notifications/services/notification.service.js'
import { Wallet } from '../../auth/entities/wallet.entity.js'
import { KybDocument } from '../../auth/entities/kyb-document.entity.js'

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycDocument)
    private kycRepository: Repository<KycDocument>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(KybDocument)
    private kybRepository: Repository<KybDocument>,
    private aiService: AiService,
    private notificationService: NotificationService,
  ) {}

  async create(userId: number, dto: CreateKycDocumentDto, file?: Express.Multer.File) {
    const document = this.kycRepository.create({
      ...dto,
      userId,
    })
    const savedDocument = await this.kycRepository.save(document)

    try {
      const analysis = file
        ? await this.aiService.analyzeKycFile(userId, dto.documentType, file)
        : await this.aiService.analyzeKycDocument(userId, dto.documentType, dto.ocrData || '')
      savedDocument.aiTrustScore = Math.round(analysis.confidenceScore * 100)
      savedDocument.metadata = { ...savedDocument.metadata, analysis }
      await this.kycRepository.save(savedDocument)
    } catch (error) {
      console.error('AI analysis failed for KYC document:', error)
    }

    return savedDocument
  }

  async findByUserId(userId: number) {
    return this.kycRepository.find({ where: { userId } })
  }

  async getTrustScore(userId: number) {
    return this.calculateTrustScore(userId)
  }

  async recalculateTrustScore(userId: number) {
    return this.calculateTrustScore(userId)
  }

  private async calculateTrustScore(userId: number) {
    const [kycDocuments, kybDocuments] = await Promise.all([
      this.kycRepository.find({ where: { userId } }),
      this.kybRepository.find({ where: { userId } }),
    ])
    const documents = [...kycDocuments, ...kybDocuments]
    const analyses = documents
      .map((document) => document.metadata?.analysis)
      .filter((analysis): analysis is Record<string, any> => Boolean(analysis))
    const fraudIndicators = analyses.reduce((count, analysis) => {
      const indicators = analysis.fraudIndicators ?? analysis.fraud_indicators
      return count + (Array.isArray(indicators) ? indicators.length : 0)
    }, 0)
    const approvedKyc = kycDocuments.some((document) => document.status === KycStatus.APPROVED)
    const approvedKyb = kybDocuments.some((document) => document.status === 'APPROVED')
    let score = 50 + (approvedKyc ? 20 : 0) + (approvedKyb ? 15 : 0)
    score += analyses.reduce((total, analysis) => {
      const impact = Number(analysis.trustScoreImpact ?? analysis.trust_score_impact ?? 0)
      return total + (Number.isFinite(impact) ? impact : 0)
    }, 0)
    score -= fraudIndicators * 10
    score = Math.max(0, Math.min(100, score))
    return {
      userId,
      trustScore: Math.round(score),
      riskLevel: score >= 80 ? 'LOW' : score >= 50 ? 'MEDIUM' : 'HIGH',
      factors: {
        kyc_status: approvedKyc ? 'APPROVED' : kycDocuments[0]?.status ?? 'NON_VERIFIE',
        kyb_status: approvedKyb ? 'APPROVED' : kybDocuments[0]?.status ?? 'NON_VERIFIE',
        documents_analyzed: analyses.length,
        fraud_indicators_count: fraudIndicators,
      },
      recommendation: fraudIndicators > 0 ? 'Manual review required due to fraud indicators.' : approvedKyc && approvedKyb ? 'Fully verified.' : 'Complete KYC/KYB verification',
    }
  }

  async findOne(id: number) {
    const document = await this.kycRepository.findOne({ where: { id } })
    if (!document) {
      throw new NotFoundException('Document KYC non trouvé')
    }
    return document
  }

  async review(id: number, reviewerId: number, dto: ReviewKycDocumentDto) {
    const document = await this.findOne(id)
    document.status = dto.status
    document.rejectionReason = dto.rejectionReason ?? null
    document.reviewedBy = reviewerId
    document.reviewedAt = new Date()
    const savedDocument = await this.kycRepository.save(document)
    await this.userRepository.update(document.userId, { kycStatus: dto.status })
    if (dto.status === KycStatus.APPROVED) {
      await this.walletRepository.update({ userId: document.userId }, { dailyLimit: 5000, monthlyLimit: 50000 })
    }
    await this.notificationService.create(
      document.userId,
      dto.status === KycStatus.APPROVED ? 'KYC validé' : 'KYC rejeté',
      dto.status === KycStatus.APPROVED
        ? 'Votre identité a été validée. Vos plafonds de paiement ont été augmentés.'
        : `Votre demande KYC a été rejetée${dto.rejectionReason ? ` : ${dto.rejectionReason}` : '.'}`,
    )
    return savedDocument
  }

  async delete(id: number, requesterId?: number, isAdmin = false) {
    const document = await this.findOne(id)
    if (!isAdmin && document.userId !== requesterId) {
      throw new NotFoundException('Document KYC non trouvé')
    }
    await this.kycRepository.remove(document)
    await this.userRepository.update(document.userId, { kycStatus: KycStatus.NON_VERIFIE })
    return { message: 'Document KYC supprimé' }
  }
}
