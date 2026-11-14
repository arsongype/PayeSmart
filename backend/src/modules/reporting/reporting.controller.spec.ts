import 'reflect-metadata'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Role } from '../auth/enums/role.enum.js'
import { RolesGuard } from '../../common/guards/roles.guard.js'
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js'
import { ReportingController } from './reporting.controller.js'

describe('ReportingController', () => {
  it('restricts PDF export to administrators', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ReportingController.prototype.exportReport)).toEqual([Role.ADMIN])
    expect(Reflect.getMetadata(GUARDS_METADATA, ReportingController.prototype.exportReport)).toContain(RolesGuard)
  })
})
