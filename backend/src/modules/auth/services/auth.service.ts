import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { User } from '../entities/user.entity.js';
import { Profile } from '../entities/profile.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { PasswordResetToken } from '../entities/password-reset-token.entity.js';
import { LoginAttempt } from '../entities/login-attempt.entity.js';
import { PaymentMethod } from '../entities/payment-method.entity.js';
import { FraudAlert } from '../entities/fraud-alert.entity.js';
import { DeviceFingerprint } from '../entities/device-fingerprint.entity.js';
import { OtpCode } from '../entities/otp-code.entity.js';
import { RegisterDto, LoginDto, UpdateMeDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, EnableTwoFactorDto, ConfirmTwoFactorSetupDto, CreatePaymentMethodDto } from '../dto/auth.dto.js';
import { ConfigService } from '@nestjs/config';
import { Role } from '../enums/role.enum.js';
import { KycStatus } from '../enums/kyc-status.enum.js';
import { Wallet } from '../entities/wallet.entity.js';
import { WalletStatus } from '../enums/wallet-status.enum.js';
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { NotificationService } from '../../../notifications/services/notification.service.js'
import { AuditService } from '../../../security/services/audit.service.js'
import { getCurrencyForCountry, INITIAL_WALLET_BALANCE } from './wallet-defaults.js'

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
})

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(LoginAttempt)
    private loginAttemptRepository: Repository<LoginAttempt>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(FraudAlert)
    private fraudAlertRepository: Repository<FraudAlert>,
    @InjectRepository(DeviceFingerprint)
    private deviceFingerprintRepository: Repository<DeviceFingerprint>,
    @InjectRepository(OtpCode)
    private otpCodeRepository: Repository<OtpCode>,
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
    const blocked = await this.isLoginBlocked(dto.email, context?.ipAddress)
    if (blocked) {
      throw new ForbiddenException('Compte temporairement bloqué suite à trop de tentatives de connexion')
    }

    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      await this.recordLoginAttempt(dto.email, context?.ipAddress, context?.userAgent, false)
      throw new UnauthorizedException('Identifiants invalides');
    }

    const matches = await argon2.verify(user.passwordHash, dto.password);
    if (!matches) {
      await this.recordLoginAttempt(dto.email, context?.ipAddress, context?.userAgent, false)
      throw new UnauthorizedException('Identifiants invalides');
    }

    await this.recordLoginAttempt(dto.email, context?.ipAddress, context?.userAgent, true)

    if (user.isTwoFactorEnabled) {
      if (!dto.otpCode) {
        throw new BadRequestException('2FA_REQUIRED');
      }
      const isValid = (await totp.verify(dto.otpCode, { secret: user.twoFactorSecret, epochTolerance: 30 })).valid;
      if (!isValid) {
        throw new BadRequestException('Code 2FA invalide');
      }
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

      await this.registerDeviceFingerprint(user.id, fingerprint, context)
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
      isEmailVerified: user.isEmailVerified,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
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

  async generateEmailVerificationToken(userId: number) {
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await this.userRepository.update(userId, { isEmailVerified: false })
    await this.passwordResetTokenRepository.save(
      this.passwordResetTokenRepository.create({
        userId,
        tokenHash,
        expiresAt,
        isUsed: false,
      }),
    )

    return token
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex')
    const tokenRecord = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash, isUsed: false },
      relations: { user: true },
    })

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token de vérification invalide ou expiré')
    }

    tokenRecord.isUsed = true
    tokenRecord.usedAt = new Date()
    await this.passwordResetTokenRepository.save(tokenRecord)

    await this.userRepository.update(tokenRecord.userId, { isEmailVerified: true })
    const user = await this.userRepository.findOne({ where: { id: tokenRecord.userId } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')

    return { message: 'Email vérifié avec succès', user: { id: user.id, email: user.email, isEmailVerified: true } }
  }

  async generateTwoFactorSecret(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')

    const secret = totp.generateSecret()
    const otpauthUrl = `otpauth://totp/PayeSmart:${user.email}?secret=${secret}&issuer=PayeSmart&digits=6`
    await this.userRepository.update(userId, { twoFactorSecret: secret })

    return { secret, otpauthUrl }
  }

  async enableTwoFactor(userId: number, dto: ConfirmTwoFactorSetupDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')
    if (!user.twoFactorSecret) throw new BadRequestException('Veuillez d\'abord générer un secret 2FA')

    const result = await totp.verify(dto.code, { secret: user.twoFactorSecret, epochTolerance: 30 })
    if (!result.valid) throw new BadRequestException('Code 2FA invalide')

    await this.userRepository.update(userId, { isTwoFactorEnabled: true })
    return { message: '2FA activé avec succès' }
  }

  async disableTwoFactor(userId: number, dto: EnableTwoFactorDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')
    if (!user.isTwoFactorEnabled) throw new BadRequestException('2FA n\'est pas activé')
    if (!user.twoFactorSecret) throw new BadRequestException('Secret 2FA manquant')

    const result = await totp.verify(dto.code, { secret: user.twoFactorSecret, epochTolerance: 30 })
    if (!result.valid) throw new BadRequestException('Code 2FA invalide')

    await this.userRepository.update(userId, { isTwoFactorEnabled: false, twoFactorSecret: '' })
    return { message: '2FA désactivé avec succès' }
  }

  async getTwoFactorStatus(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')
    return {
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret ? '***' : null,
    }
  }

  async verifyTwoFactor(email: string, code: string, context?: { ipAddress: string; userAgent: string }) {
    const where: { email: string; ipAddress?: string } = { email }
    if (context?.ipAddress) where.ipAddress = context.ipAddress
    const recentAttempt = await this.loginAttemptRepository.findOne({
      where,
      order: { createdAt: 'DESC' },
    })

    const maxAttempts = 5
    const lockDurationMinutes = 15

    if (recentAttempt && recentAttempt.isLocked && recentAttempt.lockedUntil && recentAttempt.lockedUntil > new Date()) {
      throw new ForbiddenException('Trop de tentatives de vérification 2FA. Réessayez dans 15 minutes.')
    }

    const user = await this.userRepository.findOne({ where: { email } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')
    if (!user.isTwoFactorEnabled) throw new BadRequestException('2FA n\'est pas activé')
    if (!user.twoFactorSecret) throw new BadRequestException('Secret 2FA manquant')

    const result = await totp.verify(code, { secret: user.twoFactorSecret, epochTolerance: 30 })
    if (!result.valid) {
      const attempts = recentAttempt ? recentAttempt.attempts + 1 : 1
      const lockedUntil = attempts >= maxAttempts ? new Date(Date.now() + lockDurationMinutes * 60 * 1000) : null

      if (recentAttempt) {
        await this.loginAttemptRepository.save({
          ...recentAttempt,
          attempts,
          isLocked: attempts >= maxAttempts,
          lockedUntil,
          updatedAt: new Date(),
        })
      } else {
        await this.loginAttemptRepository.save(
          this.loginAttemptRepository.create({
            email,
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
            attempts: 1,
            isLocked: false,
            lockedUntil: null,
          }),
        )
      }

      throw new BadRequestException('Code 2FA invalide')
    }

    if (recentAttempt) {
      await this.loginAttemptRepository.delete(recentAttempt.id)
    }

    return this.generateTokens(user)
  }

  async forgotPassword(dto: ForgotPasswordDto, context?: { ipAddress: string; userAgent: string }) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } })
    if (!user) {
      return { message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.' }
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await this.passwordResetTokenRepository.save(
      this.passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        isUsed: false,
      }),
    )

    await this.notificationService.create(user.id, 'Réinitialisation du mot de passe', `Un lien de réinitialisation a été demandé pour votre compte.`)
    if (context) {
      await this.auditService.record({ userId: user.id, method: 'POST', path: '/auth/forgot-password', action: 'PASSWORD_RESET_REQUESTED', ipAddress: context.ipAddress, userAgent: context.userAgent, statusCode: 200 })
    }

    return { message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.', email: dto.email }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex')
    const tokenRecord = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash, isUsed: false },
      relations: { user: true },
    })

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token de réinitialisation invalide ou expiré')
    }

    const passwordHash = await argon2.hash(dto.password)
    await this.userRepository.update(tokenRecord.userId, { passwordHash })

    tokenRecord.isUsed = true
    tokenRecord.usedAt = new Date()
    await this.passwordResetTokenRepository.save(tokenRecord)

    await this.refreshTokenRepository.update({ userId: tokenRecord.userId }, { isRevoked: true })

    return { message: 'Mot de passe réinitialisé avec succès.', email: tokenRecord.user.email }
  }

  async recordLoginAttempt(email: string, ipAddress: string | undefined, userAgent: string | undefined, success: boolean) {
    const where: { email: string; ipAddress?: string } = { email }
    if (ipAddress) where.ipAddress = ipAddress
    const attempt = await this.loginAttemptRepository.findOne({
      where,
      order: { createdAt: 'DESC' },
    })

    if (success) {
      if (attempt) {
        await this.loginAttemptRepository.delete(attempt.id)
      }
      return
    }

    const now = new Date()
    if (attempt && attempt.isLocked && attempt.lockedUntil && attempt.lockedUntil > now) {
      return
    }

    const maxAttempts = 3
    const lockDurationMinutes = 15

    if (attempt && attempt.attempts + 1 >= maxAttempts) {
      const lockedUntil = new Date(now.getTime() + lockDurationMinutes * 60 * 1000)
      await this.loginAttemptRepository.save(
        this.loginAttemptRepository.create({
          email,
          ipAddress: ipAddress ?? undefined,
          userAgent: userAgent ?? undefined,
          attempts: attempt.attempts + 1,
          isLocked: true,
          lockedUntil,
        }),
      )
      await this.auditService.record({ method: 'POST', path: '/auth/login', action: 'ACCOUNT_LOCKED', ipAddress: ipAddress ?? undefined, userAgent: userAgent ?? undefined, statusCode: 403 })
      return
    }

    if (attempt) {
      await this.loginAttemptRepository.save({ ...attempt, attempts: attempt.attempts + 1 })
    } else {
      await this.loginAttemptRepository.save(
        this.loginAttemptRepository.create({
          email,
          ipAddress: ipAddress ?? undefined,
          userAgent: userAgent ?? undefined,
          attempts: 1,
          isLocked: false,
        }),
      )
    }
  }

  async isLoginBlocked(email: string, ipAddress: string | undefined): Promise<boolean> {
    const where: { email: string; ipAddress?: string } = { email }
    if (ipAddress) where.ipAddress = ipAddress
    const attempt = await this.loginAttemptRepository.findOne({
      where,
      order: { createdAt: 'DESC' },
    })

    if (!attempt || !attempt.isLocked) return false
    if (attempt.lockedUntil && attempt.lockedUntil > new Date()) return true
    if (attempt.lockedUntil && attempt.lockedUntil <= new Date()) {
      await this.loginAttemptRepository.delete(attempt.id)
    }
    return false
  }

  async createPaymentMethod(userId: number, dto: CreatePaymentMethodDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé')

    return this.paymentMethodRepository.save(
      this.paymentMethodRepository.create({
        userId,
        methodType: dto.methodType,
        lastFourDigits: dto.lastFourDigits ?? null,
        brand: dto.brand ?? null,
        expiryDate: dto.expiryDate ?? null,
        metadata: null,
        isActive: true,
      }),
    )
  }

  async getPaymentMethods(userId: number) {
    return this.paymentMethodRepository.find({ where: { userId }, order: { createdAt: 'DESC' } })
  }

  async deletePaymentMethod(userId: number, paymentMethodId: number) {
    const method = await this.paymentMethodRepository.findOne({ where: { id: paymentMethodId, userId } })
    if (!method) throw new NotFoundException('Moyen de paiement non trouvé')
    await this.paymentMethodRepository.remove(method)
    return { message: 'Moyen de paiement supprimé' }
  }

  async createFraudAlert(transactionId: number, userId: number, riskScore: number, riskLevel: string, reasons: string[]) {
    const existing = await this.fraudAlertRepository.findOne({ where: { transactionId } })
    if (existing) return existing

    return this.fraudAlertRepository.save(
      this.fraudAlertRepository.create({
        transactionId,
        userId,
        riskScore,
        riskLevel,
        reasons: reasons.join(', '),
        status: 'OPEN',
        adminNotes: null,
        reviewedAt: null,
        reviewedBy: null,
      }),
    )
  }

  async registerDeviceFingerprint(userId: number, fingerprintHash: string, context: { deviceName?: string; browser?: string; os?: string; ipAddress?: string }) {
    const existing = await this.deviceFingerprintRepository.findOne({ where: { userId, fingerprintHash } })
    if (existing) {
      existing.lastSeenAt = new Date()
      if (context.ipAddress) existing.ipAddress = context.ipAddress
      await this.deviceFingerprintRepository.save(existing)
      return existing
    }

    return this.deviceFingerprintRepository.save(
      this.deviceFingerprintRepository.create({
        userId,
        fingerprintHash,
        deviceName: context.deviceName ?? null,
        browser: context.browser ?? null,
        os: context.os ?? null,
        ipAddress: context.ipAddress ?? null,
        metadata: null,
        isTrusted: true,
        lastSeenAt: new Date(),
      }),
    )
  }

  async getDeviceFingerprints(userId: number) {
    return this.deviceFingerprintRepository.find({ where: { userId }, order: { lastSeenAt: 'DESC' } })
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
        isEmailVerified: user.isEmailVerified,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
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
