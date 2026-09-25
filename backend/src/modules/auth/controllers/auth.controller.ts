import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Param, Patch, Delete } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto, UpdateRoleDto, UpdateKycStatusDto, UpdateMeDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, EnableTwoFactorDto, ConfirmTwoFactorSetupDto, CreatePaymentMethodDto, TwoFactorVerifyDto } from '../dto/auth.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum.js';
import { KycStatus } from '../enums/kyc-status.enum.js';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

interface RequestWithUser extends Request {
  user: { sub: string; email: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      userAgent: req.get('user-agent') ?? 'unknown',
      deviceFingerprint: req.get('x-device-fingerprint') ?? null,
    })
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: RequestWithUser) {
    return this.authService.me(req.user.sub)
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateMe(@Req() req: RequestWithUser, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(parseInt(req.user.sub, 10), dto)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  getAdminData() {
    return { message: 'Bienvenue sur la zone réservée à l administration' }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users')
  async getAllUsers() {
    return this.authService.getAllUsers()
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.authService.updateUserRole(parseInt(id), dto.role)
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('users/:id/kyc')
  async updateUserKycStatus(@Param('id') id: string, @Body() dto: UpdateKycStatusDto) {
    return this.authService.updateUserKycStatus(parseInt(id), dto.kycStatus)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto, {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      userAgent: req.get('user-agent') ?? 'unknown',
    })
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-email/request')
  @HttpCode(HttpStatus.OK)
  requestEmailVerification(@Req() req: RequestWithUser) {
    return this.authService.generateEmailVerificationToken(parseInt(req.user.sub, 10))
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('two-factor/status')
  getTwoFactorStatus(@Req() req: RequestWithUser) {
    return this.authService.getTwoFactorStatus(parseInt(req.user.sub, 10))
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('two-factor/setup')
  @HttpCode(HttpStatus.OK)
  setupTwoFactor(@Req() req: RequestWithUser) {
    return this.authService.generateTwoFactorSecret(parseInt(req.user.sub, 10))
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('two-factor/enable')
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@Req() req: RequestWithUser, @Body() dto: ConfirmTwoFactorSetupDto) {
    return this.authService.enableTwoFactor(parseInt(req.user.sub, 10), dto)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('two-factor/disable')
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@Req() req: RequestWithUser, @Body() dto: EnableTwoFactorDto) {
    return this.authService.disableTwoFactor(parseInt(req.user.sub, 10), dto)
  }

  @Post('two-factor/verify')
  @HttpCode(HttpStatus.OK)
  verifyTwoFactor(@Body() dto: TwoFactorVerifyDto, @Req() req: Request) {
    return this.authService.verifyTwoFactor(dto.email, dto.code, {
      ipAddress: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      userAgent: req.get('user-agent') ?? 'unknown',
    })
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('payment-methods')
  createPaymentMethod(@Req() req: RequestWithUser, @Body() dto: CreatePaymentMethodDto) {
    return this.authService.createPaymentMethod(parseInt(req.user.sub, 10), dto)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payment-methods')
  getPaymentMethods(@Req() req: RequestWithUser) {
    return this.authService.getPaymentMethods(parseInt(req.user.sub, 10))
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('payment-methods/:id')
  deletePaymentMethod(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.authService.deletePaymentMethod(parseInt(req.user.sub, 10), parseInt(id))
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('devices')
  getDevices(@Req() req: RequestWithUser) {
    return this.authService.getDeviceFingerprints(parseInt(req.user.sub, 10))
  }
}
