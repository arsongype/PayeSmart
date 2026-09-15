import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Profile } from '../../auth/entities/profile.entity.js'
import { CreateProfileDto } from '../../auth/dto/profile.dto.js'

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async create(userId: number, dto: CreateProfileDto) {
    const existing = await this.profileRepository.findOne({ where: { userId } })
    if (existing) {
      throw new ConflictException('Un profil existe déjà pour cet utilisateur')
    }

    const profile = this.profileRepository.create({
      ...dto,
      userId,
    })

    return this.profileRepository.save(profile)
  }

  async findByUserId(userId: number) {
    const profile = await this.profileRepository.findOne({ where: { userId } })
    if (!profile) {
      throw new NotFoundException('Profil non trouvé')
    }
    return profile
  }

  async update(userId: number, dto: Partial<CreateProfileDto>) {
    const profile = await this.findByUserId(userId)
    Object.assign(profile, dto)
    return this.profileRepository.save(profile)
  }

  async delete(userId: number) {
    const profile = await this.findByUserId(userId)
    await this.profileRepository.remove(profile)
    return { message: 'Profil supprimé' }
  }
}
