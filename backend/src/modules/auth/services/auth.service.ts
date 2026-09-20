import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { User } from '../entities/user.entity.js';
import { Profile } from '../entities/profile.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { RegisterDto, LoginDto, UpdateMeDto } from '../dto/auth.dto.js';
import { ConfigService } from '@nestjs/config';
import { Role } from '../enums/role.enum.js';
import { KycStatus } from '../enums/kyc-status.enum.js';
import { Wallet } from '../entities/wallet.entity.js';
import { WalletStatus } from '../enums/wallet-status.enum.js';
import { createHash } from 'node:crypto'
import { NotificationService } from '../../../notifications/services/notification.service.js'
import { AuditService } from '../../../security/services/audit.service.js'
import { getCurrencyForCountry, INITIAL_WALLET_BALANCE } from './wallet-defaults.js'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
      @InjectRepository(Profile)
      private profileRepository: Repository<Profile>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private auditService: AuditService,
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
      const { address, city, country, postalCode, ...userData } = dto
      const user = this.userRepository.create({
        ...userData,
        role: normalizedRole,
        kycStatus: normalizedKycStatus,
        passwordHash,
      })

      const savedUser = await this.userRepository.save(user)
      await this.profileRepository.save(this.profileRepository.create({
        userId: savedUser.id,
        address,
        city,
        country,
        postalCode,
      }))
      return this.generateTokens(savedUser)
    } catch (error) {
      console.error('Register error', error)
      throw error
    }
  }

  async login(dto: LoginDto, context?: { ipAddress: string; userAgent: string; deviceFingerprint: string | null }) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const matches = await argon2.verify(user.passwordHash, dto.password);
    if (!matches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (context) {
      const fingerprint = createHash('sha256').update(context.deviceFingerprint || context.userAgent).digest('hex')
      const previous = user.securityMetadata
      const anomaly = Boolean(previous && (previous.deviceFingerprint !== fingerprint || previous.ipAddress !== context.ipAddress))
      user.securityMetadata = { deviceFingerprint: fingerprint, ipAddress: context.ipAddress, lastLoginAt: Date.now() }
      await this.userRepository.save(user)
      if (anomaly) {
        await this.auditService.record({ userId: user.id, method: 'LOGIN', path: '/auth/login', action: 'ANOMALOUS_LOGIN', ipAddress: context.ipAddress, userAgent: context.userAgent, statusCode: 200 })
        await this.notificationService.create(user.id, 'Nouvelle connexion détectée', `Une connexion depuis un nouvel appareil ou une nouvelle adresse IP a été détectée (${context.ipAddress}).`)
      }
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
    const user = await this.userRepository.findOne({
      where: { id: parseInt(userId) },
      relations: { profile: true },
    })
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé')
    }

    const wallet = await this.ensureWallet(user.id)
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      cin: user.cin,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      avatarUrl: user.avatarUrl,
      address: user.profile?.address,
      city: user.profile?.city,
      country: user.profile?.country,
      postalCode: user.profile?.postalCode,
      profile: user.profile,
      role: user.role,
      kycStatus: user.kycStatus,
      kybStatus: user.kybStatus,
      accountStatus: user.accountStatus,
      suspensionReason: user.suspensionReason,
      reactivationDeadline: user.reactivationDeadline,
      wallet,
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
      accountStatus: user.accountStatus,
      suspensionReason: user.suspensionReason,
      reactivationDeadline: user.reactivationDeadline,
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

  async updateMe(userId: number, dto: UpdateMeDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé')
    }

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({ where: { email: dto.email } })
      if (existingEmail && existingEmail.id !== user.id) {
        throw new ConflictException('Cet email est déjà utilisé')
      }
    }

    if (dto.cin && dto.cin !== user.cin) {
      const existingCin = await this.userRepository.findOne({ where: { cin: dto.cin } })
      if (existingCin && existingCin.id !== user.id) {
        throw new ConflictException('Ce numéro CIN est déjà utilisé')
      }
    }

    Object.assign(user, dto)
    await this.userRepository.save(user)

    return this.me(String(user.id))
  }

  private async generateTokens(user: User) {
    const wallet = await this.ensureWallet(user.id)
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
        avatarUrl: user.avatarUrl,
        role: user.role,
        kycStatus: user.kycStatus,
        kybStatus: user.kybStatus,
        accountStatus: user.accountStatus,
        suspensionReason: user.suspensionReason,
        reactivationDeadline: user.reactivationDeadline,
        wallet,
      },
    };
  }

  private async ensureWallet(userId: number): Promise<Wallet> {
    const existing = await this.walletRepository.findOne({ where: { userId } })
    if (existing) return existing

    const user = await this.userRepository.findOne({ where: { id: userId }, relations: { profile: true } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')

    return this.walletRepository.save(
      this.walletRepository.create({
        userId,
        walletNumber: this.generateWalletNumber(userId),
        cardNumber: this.generateCardNumber(userId),
        cardHolderName: [user.firstName, user.lastName].filter(Boolean).join(' ').toUpperCase() || user.email.toUpperCase(),
        status: WalletStatus.ACTIVE,
        currency: getCurrencyForCountry(user.profile?.country),
        balance: INITIAL_WALLET_BALANCE,
        dailyLimit: 0,
        monthlyLimit: 0,
      }),
    )
  }

  private generateWalletNumber(userId: number): string {
    const randomPart = Math.floor(100000 + Math.random() * 900000)
    return `${String(userId).padStart(8, '0')}${randomPart}`
  }

  private generateCardNumber(userId: number): string {
    const suffix = String(userId).padStart(8, '0') + String(Math.floor(10000000 + Math.random() * 90000000))
    return `5399 ${suffix.slice(0, 4)} ${suffix.slice(4, 8)} ${suffix.slice(8, 12)}`
  }
}