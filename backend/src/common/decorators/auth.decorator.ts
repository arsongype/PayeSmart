import { applyDecorators, Type } from '@nestjs/common'
import { Roles } from './roles.decorator.js'

export const Auth = (...roles: string[]) =>
  applyDecorators(
    Roles(...roles),
  )

export type { Type } from '@nestjs/common'
