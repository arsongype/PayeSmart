import { Controller, Get, UseGuards, Param, Patch, Body, Req, Post, Delete } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../../../common/guards/roles.guard.js'
import { UsersService } from '../../../users/services/users.service.js'
import { Role } from '../../auth/enums/role.enum.js'
import { Roles } from '../../auth/controllers/auth.controller.js'
import { KycService } from '../services/kyc.service.js'
import { KybService } from '../services/kyb.service.js'
import { ReviewKycDocumentDto } from '../../auth/dto/kyc.dto.js'
import { ReviewKybDocumentDto } from '../../auth/dto/kyb.dto.js'
import { AccountManagementService } from '../../../users/services/account-management.service.js'

interface RequestWithUser {
  user: { sub: string; email: string; role: string }
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private usersService: UsersService,
    private kycService: KycService,
    private kybService: KybService,
    private accountManagementService: AccountManagementService,
  ) {}

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string) {
    const user = await this.usersService.findById(parseInt(id))
    return user
  }

  @Get('users')
  async getAllUsers() {
    return this.usersService.findAll()
  }

  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() body: { role: Role }) {
    return this.usersService.updateRole(parseInt(id), body.role)
  }

  @Patch('kyc/:id/review')
  async reviewKyc(@Param('id') id: string, @Body() dto: ReviewKycDocumentDto, @Req() req: RequestWithUser) {
    return this.kycService.review(parseInt(id), parseInt(req.user.sub, 10), dto)
  }

  @Patch('kyb/:id/review')
  async reviewKyb(@Param('id') id: string, @Body() dto: ReviewKybDocumentDto, @Req() req: RequestWithUser) {
    return this.kybService.review(parseInt(id), parseInt(req.user.sub, 10), dto)
  }

  @Patch('users/:id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: RequestWithUser,
  ) {
    return this.accountManagementService.suspendUser(parseInt(id), body.reason, parseInt(req.user.sub, 10))
  }

  @Patch('users/:id/reactivate')
  async reactivateUser(@Param('id') id: string) {
    return this.accountManagementService.reactivateUser(parseInt(id))
  }

  @Delete('users/:id')
  async softDeleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.softDeleteUser(parseInt(id), parseInt(req.user.sub, 10))
  }

  @Delete('users/:id/permanent')
  async permanentlyDeleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.permanentlyDeleteUser(parseInt(id), parseInt(req.user.sub, 10))
  }

  @Patch('users/:id/cancel-deletion')
  async cancelDeletion(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.cancelDeletion(parseInt(id), parseInt(req.user.sub, 10))
  }

  @Patch('users/:id/reset-kyc')
  async resetKyc(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.resetKyc(parseInt(id), req.user.role === 'ADMIN')
  }

  @Patch('users/:id/reset-kyb')
  async resetKyb(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.accountManagementService.resetKyb(parseInt(id), req.user.role === 'ADMIN')
  }

  @Post('cleanup-expired')
  async cleanupExpiredDeletions() {
    const count = await this.accountManagementService.checkExpiredDeletions()
    return { message: `${count} compte(s) définitivement supprimé(s)` }
  }
}
