import { Controller, Post, Get, Patch, Delete, UseGuards, Param, Body, Req, UseInterceptors, UploadedFile, ForbiddenException } from '@nestjs/common'
import { Request } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../../../common/guards/roles.guard.js'
import { Roles } from '../../../common/decorators/roles.decorator.js'
import { Role } from '../../auth/enums/role.enum.js'
import { AccountManagementService } from '../../../users/services/account-management.service.js'
import { KycService } from '../services/kyc.service.js'
import { CreateKycDocumentDto, ReviewKycDocumentDto } from '../../auth/dto/kyc.dto.js'

interface RequestWithUser extends Request {
  user: { sub: string; email: string; role: string }
}

@Controller('kyc')
@UseGuards(AuthGuard('jwt'))
export class KycController {
  constructor(
    private kycService: KycService,
    private accountManagementService: AccountManagementService,
  ) {}

  @Post('revalidate')
  revalidate(@Req() req: RequestWithUser) {
    return this.accountManagementService.revalidateAccount(parseInt(req.user.sub, 10))
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(@Body() dto: CreateKycDocumentDto, @UploadedFile() file: Express.Multer.File, @Req() req: RequestWithUser) {
    const userId = parseInt(req.user.sub, 10)
    const documentUrl = file ? `/uploads/${file.filename}` : dto.documentUrl
    return this.kycService.create(userId, { ...dto, documentUrl }, file)
  }

  @Get('trust-score/:userId')
  getTrustScore(@Param('userId') userId: string, @Req() req: RequestWithUser) {
    const requestedUserId = parseInt(userId, 10)
    if (requestedUserId !== parseInt(req.user.sub, 10) && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Accès refusé')
    }
    return this.kycService.getTrustScore(requestedUserId)
  }

  @Post('trust-score/:userId/recalculate')
  recalculateTrustScore(@Param('userId') userId: string, @Req() req: RequestWithUser) {
    const requestedUserId = parseInt(userId, 10)
    if (requestedUserId !== parseInt(req.user.sub, 10) && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Accès refusé')
    }
    return this.kycService.recalculateTrustScore(requestedUserId)
  }

  @Get(':userId')
  findByUserId(@Param('userId') userId: string, @Req() req: RequestWithUser) {
    const requestedUserId = parseInt(userId, 10)
    const currentUserId = parseInt(req.user.sub, 10)
    if (requestedUserId !== currentUserId && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez consulter que vos propres documents KYC')
    }
    return this.kycService.findByUserId(requestedUserId)
  }

  @Patch(':id/review')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewKycDocumentDto, @Req() req: RequestWithUser) {
    const reviewerId = parseInt(req.user.sub, 10)
    return this.kycService.review(parseInt(id, 10), reviewerId, dto)
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.kycService.delete(parseInt(id, 10), parseInt(req.user.sub, 10), req.user.role === 'ADMIN')
  }
}
