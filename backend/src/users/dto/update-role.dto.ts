import { IsString, IsNotEmpty } from 'class-validator'

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  role: 'USER' | 'MERCHANT' | 'ADMIN'
}
