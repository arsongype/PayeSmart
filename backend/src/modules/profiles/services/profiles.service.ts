import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Profile } from '../../auth/entities/profile.entity.js'
import { CreateProfileDto } from '../../auth/dto/profile.dto.js'
import { User } from '../../auth/entities/user.entity.js'

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
    return profile ?? this.profileRepository.save(this.profileRepository.create({ userId }))
  }

  async update(userId: number, dto: Partial<CreateProfileDto>) {
    const profile = await this.profileRepository.findOne({ where: { userId } })
    if (!profile) {
      return this.profileRepository.save(this.profileRepository.create({ ...dto, userId }))
    }
    Object.assign(profile, dto)
    return this.profileRepository.save(profile)
  }

  async updateAvatar(userId: number, filename: string) {
    await this.userRepository.update(
      { id: userId },
      { avatarUrl: `/uploads/${filename}` }
    )
    return this.userRepository.findOneOrFail({ where: { id: userId } })
  }

  async clearAvatar(userId: number) {
    await this.userRepository.update(
      { id: userId },
      { avatarUrl: null }
    )
    return { avatarUrl: null }
  }

  async delete(userId: number) {
    const profile = await this.findByUserId(userId)
    await this.profileRepository.remove(profile)
    return { message: 'Profil supprimé' }
  }
}
