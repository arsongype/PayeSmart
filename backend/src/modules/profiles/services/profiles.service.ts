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
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('Utilisateur non trouvé')

    user.avatarUrl = `/uploads/${filename}`
    await this.userRepository.save(user)
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      cin: user.cin,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      avatarUrl: user.avatarUrl,
      role: user.role,
      kycStatus: user.kycStatus,
      kybStatus: user.kybStatus,
      accountStatus: user.accountStatus,
      suspensionReason: user.suspensionReason,
      reactivationDeadline: user.reactivationDeadline,
      isEmailVerified: user.isEmailVerified,
    }
  }

  async delete(userId: number) {
    const profile = await this.findByUserId(userId)
    await this.profileRepository.remove(profile)
    return { message: 'Profil supprimé' }
  }
}
