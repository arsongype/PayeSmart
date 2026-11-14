import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator'

export class ConfirmTwoFactorDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string

  @IsOptional()
  @IsIn(['AUTHENTICATOR', 'NOTIFICATION_OTP'])
  method?: 'AUTHENTICATOR' | 'NOTIFICATION_OTP'
}