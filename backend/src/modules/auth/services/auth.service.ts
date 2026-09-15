import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { User } from '../entities/user.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { RegisterDto, LoginDto } from '../dto/auth.dto.js';
import { ConfigService } from '@nestjs/config';
import { Role } from '../enums/role.enum.js';
import { KycStatus } from '../enums/kyc-status.enum.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } })
      if (existing) {
        throw new ConflictException('Cet email est déjà utilisé')
      }

      if (dto.cin) {
        const existingCin = await this.userRepository.findOne({ where: { cin: dto.cin } })
        if (existingCin) {
          throw new ConflictException('Ce numéro CIN est déjà utilisé')
        }
      }

      const normalizedRole: Role = dto.role ?? Role.USER
      const normalizedKycStatus: typeof KycStatus[keyof typeof KycStatus] = dto.kycStatus ?? KycStatus.NON_VERIFIE
      const passwordHash = await argon2.hash(dto.password)
      const user = this.userRepository.create({
        ...dto,
        role: normalizedRole,
        kycStatus: normalizedKycStatus,
        passwordHash,
      })

      await this.userRepository.save(user)
      return this.generateTokens(user)
    } catch (error) {
      console.error('Register error', error)
      throw error
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const matches = await argon2.verify(user.passwordHash, dto.password);
    if (!matches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('Accès refusé');

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }
  }

  async me(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: parseInt(userId) } })
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé')
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      cin: user.cin,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      kycStatus: user.kycStatus,
      kybStatus: user.kybStatus,
    }
  }

  async getAllUsers() {
    const users = await this.userRepository.find()
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      kycStatus: user.kycStatus,
      kybStatus: user.kybStatus,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    }))
  }

  async updateUserRole(userId: number, role: Role) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé')
    }

    user.role = role
    await this.userRepository.save(user)

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    }
  }

  async updateUserKycStatus(userId: number, kycStatus: KycStatus) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé')
    }

    user.kycStatus = kycStatus
    await this.userRepository.save(user)

    return {
      id: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
    }
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') as any,
    });

    const tokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}