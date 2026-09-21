import { Controller, Post, Body, Get, Patch, Delete, UseGuards, Param, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import { ProfilesService } from '../services/profiles.service.js'
import { CreateProfileDto } from '../../auth/dto/profile.dto.js'
import { imageFileFilter, fileFilter, storage } from '../../../storage/storage.config.js'

interface RequestWithUser extends Request {
  user: { sub: string }
}

@Controller('profiles')
@UseGuards(AuthGuard('jwt'))
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Post()
  create(@Body() dto: CreateProfileDto, @Param('userId') userId: number) {
    return this.profilesService.create(userId, dto)
  }

  @Get(':userId')
  findByUserId(@Param('userId') userId: number) {
    return this.profilesService.findByUserId(userId)
  }

  @Patch(':userId')
  update(@Param('userId') userId: number, @Body() dto: CreateProfileDto) {
    return this.profilesService.update(userId, dto)
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage, fileFilter: imageFileFilter }))
  uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: RequestWithUser) {
    if (!file) throw new BadRequestException('Une image de profil est requise')
    return this.profilesService.updateAvatar(parseInt(req.user.sub, 10), file.filename)
  }

  @Delete('avatar')
  clearAvatar(@Req() req: RequestWithUser) {
    return this.profilesService.clearAvatar(parseInt(req.user.sub, 10))
  }

  @Delete(':userId')
  delete(@Param('userId') userId: number) {
    return this.profilesService.delete(userId)
  }
}
