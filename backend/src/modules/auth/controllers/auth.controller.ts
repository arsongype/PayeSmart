import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Param, Patch } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto, UpdateRoleDto, UpdateKycStatusDto } from '../dto/auth.dto.js';
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
  forgotPassword(@Body() body: { email: string }) {
    return {
      message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
      email: body.email,
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: { token: string; password: string; email?: string }) {
    return {
      message: 'Mot de passe réinitialisé avec succès.',
      email: body.email ?? null,
    }
  }
}
