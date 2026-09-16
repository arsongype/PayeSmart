import { Controller, Post, Get, Patch, Delete, UseGuards, Param, Body, Req, UseInterceptors, UploadedFile, ForbiddenException } from '@nestjs/common'
import { Request } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../../../common/guards/roles.guard.js'
import { Roles } from '../../../common/decorators/roles.decorator.js'
import { Role } from '../../auth/enums/role.enum.js'
import { KybService } from '../services/kyb.service.js'
import { CreateKybDocumentDto, ReviewKybDocumentDto } from '../../auth/dto/kyb.dto.js'
import { storage, fileFilter } from '../../../storage/storage.config.js'

interface RequestWithUser extends Request {
  user: { sub: string; email: string; role: string }
}

@Controller('kyb')
@UseGuards(AuthGuard('jwt'))
export class KybController {
  constructor(private kybService: KybService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter }))
  create(@Body() dto: CreateKybDocumentDto, @UploadedFile() file: Express.Multer.File, @Req() req: RequestWithUser) {
    const userId = parseInt(req.user.sub, 10)
    const documentUrl = file ? `/uploads/${file.filename}` : dto.documentUrl
    return this.kybService.create(userId, { ...dto, documentUrl }, file)
  }

  @Get(':userId')
  findByUserId(@Param('userId') userId: string, @Req() req: RequestWithUser) {
    const requestedUserId = parseInt(userId, 10)
    const currentUserId = parseInt(req.user.sub, 10)
    if (requestedUserId !== currentUserId && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez consulter que vos propres documents KYB')
    }
    return this.kybService.findByUserId(requestedUserId)
  }

  @Patch(':id/review')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewKybDocumentDto, @Req() req: RequestWithUser) {
    const reviewerId = parseInt(req.user.sub, 10)
    return this.kybService.review(parseInt(id, 10), reviewerId, dto)
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.kybService.delete(parseInt(id, 10), parseInt(req.user.sub, 10), req.user.role === 'ADMIN')
  }
}
