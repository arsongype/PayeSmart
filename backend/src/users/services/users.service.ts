import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from '../../modules/auth/entities/user.entity.js'
import * as bcrypt from 'bcrypt'
import { Role } from '../../modules/auth/enums/role.enum.js'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé')
    }
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } })
  }

  async findAll(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    return { users, total }
  }

  async updateRole(userId: number, role: Role): Promise<User> {
    const user = await this.findById(userId)
    user.role = role
    return this.userRepository.save(user)
  }

  async delete(userId: number): Promise<void> {
    const user = await this.findById(userId)
    await this.userRepository.remove(user)
  }
}
