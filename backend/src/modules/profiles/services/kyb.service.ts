import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { KybDocument } from '../../auth/entities/kyb-document.entity.js'
import { CreateKybDocumentDto, ReviewKybDocumentDto } from '../../auth/dto/kyb.dto.js'
import { AiService } from './ai.service.js'
import { User } from '../../auth/entities/user.entity.js'
import { Profile } from '../../auth/entities/profile.entity.js'
import { KycStatus } from '../../auth/enums/kyc-status.enum.js'
import { KybStatus } from '../../auth/enums/kyb-status.enum.js'
import { NotificationService } from '../../../notifications/services/notification.service.js'

@Injectable()
export class KybService {
  constructor(
    @InjectRepository(KybDocument)
    private kybRepository: Repository<KybDocument>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private aiService: AiService,
    private notificationService: NotificationService,
  ) {}

  async create(userId: number, dto: CreateKybDocumentDto, file?: Express.Multer.File) {
    const document = this.kybRepository.create({
      ...dto,
      userId,
    })
    const savedDocument = await this.kybRepository.save(document)

    try {
      const analysis = file
        ? await this.aiService.analyzeKybFile(userId, dto.documentType, file, dto.companyName, dto.sirenNif)
        : await this.aiService.analyzeKybDocument(
            userId,
            dto.documentType,
            dto.companyName,
            dto.sirenNif,
            dto.ocrData || '',
          )
      savedDocument.aiRiskScore = Math.round(analysis.confidenceScore * 100)
      savedDocument.metadata = { ...savedDocument.metadata, analysis }
      await this.kybRepository.save(savedDocument)
    } catch (error) {
      console.error('AI analysis failed for KYB document:', error)
    }

    return savedDocument
  }

  async findByUserId(userId: number) {
    return this.kybRepository.find({ where: { userId } })
  }

  async findOne(id: number) {
    const document = await this.kybRepository.findOne({ where: { id } })
    if (!document) {
      throw new NotFoundException('Document KYB non trouvé')
    }
    return document
  }

  async review(id: number, reviewerId: number, dto: ReviewKybDocumentDto) {
    const document = await this.findOne(id)
    document.status = dto.status
    document.rejectionReason = dto.rejectionReason ?? null
    document.reviewedBy = reviewerId
    document.reviewedAt = new Date()
    const savedDocument = await this.kybRepository.save(document)
    await this.userRepository.update(document.userId, { kybStatus: dto.status })
    if (dto.status === KybStatus.APPROVED) {
      await this.syncApprovedCompanyInformation(document.userId)
    }
    await this.notificationService.create(
      document.userId,
      dto.status === KybStatus.APPROVED ? 'KYB validé' : 'KYB rejeté',
      dto.status === KybStatus.APPROVED
        ? 'Votre entreprise est validée. Les fonctionnalités marchand sont activées.'
        : `Votre demande KYB a été rejetée${dto.rejectionReason ? ` : ${dto.rejectionReason}` : '.'}`,
    )
    return savedDocument
  }

  private async syncApprovedCompanyInformation(userId: number) {
    const documents = await this.kybRepository.find({ where: { userId, status: KybStatus.APPROVED } })
    const profile = await this.profileRepository.findOne({ where: { userId } })
      ?? this.profileRepository.create({ userId })
    const company = documents
      .map((document) => (document.metadata as { analysis?: { extracted_data?: Record<string, unknown> } } | null)?.analysis?.extracted_data)
      .filter((data): data is Record<string, unknown> => Boolean(data))
      .reduce<Record<string, unknown>>((merged, data) => ({ ...merged, ...data }), {})

    if (typeof company.company_name === 'string') profile.companyName = company.company_name
    if (typeof company.siren_nif === 'string') profile.sirenNif = company.siren_nif
    if (typeof company.address === 'string') profile.companyAddress = company.address
    if (typeof company.trade_register === 'string') profile.tradeRegister = company.trade_register
    if (typeof company.iban === 'string') profile.companyRib = company.iban
    await this.profileRepository.save(profile)
  }

  async delete(id: number, requesterId?: number, isAdmin = false) {
    const document = await this.findOne(id)
    if (!isAdmin && document.userId !== requesterId) {
      throw new NotFoundException('Document KYB non trouvé')
    }
    await this.kybRepository.remove(document)
    await this.userRepository.update(document.userId, { kybStatus: KybStatus.NON_VERIFIE })
    return { message: 'Document KYB supprimé' }
  }
}
