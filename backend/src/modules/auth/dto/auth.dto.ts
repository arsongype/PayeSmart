import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, Matches, ValidateIf, IsIn } from 'class-validator';
import { Role } from '../enums/role.enum.js';
import { KycStatus } from '../enums/kyc-status.enum.js';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @Matches(/^\d{8,12}$/, { message: 'La CIN doit contenir entre 8 et 12 chiffres' })
  @IsOptional()
  cin?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'Le pays doit être indiqué avec son code ISO-2 (ex. MG)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(KycStatus)
  @IsOptional()
  kycStatus?: KycStatus;
}

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @IsNotEmpty()
  password: string

  @IsString()
  @IsOptional()
  otpCode?: string
}

export class RequestAccountDeletionDto {
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code 2FA doit contenir 6 chiffres' })
  @IsOptional()
  otpCode?: string;
}

export class CancelAccountDeletionDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code 2FA doit contenir 6 chiffres' })
  @IsOptional()
  otpCode?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class UpdateKycStatusDto {
  @IsEnum(KycStatus)
  kycStatus: KycStatus;
}

export class UpdateMeDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  cin?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class EnableTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ConfirmTwoFactorSetupDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class TwoFactorVerifyDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  methodType: string;

  @IsString()
  @IsOptional()
  lastFourDigits?: string;

  @ValidateIf((dto: CreatePaymentMethodDto) => dto.methodType === 'CARD')
  @IsIn(['Visa', 'Mastercard'])
  brand?: string;

  @ValidateIf((dto: CreatePaymentMethodDto) => dto.methodType === 'CARD')
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'La date d’expiration doit être au format MM/AA' })
  expiryDate?: string;
}