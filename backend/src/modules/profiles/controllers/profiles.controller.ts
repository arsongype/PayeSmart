import { Controller, Post, Body, Get, Patch, Delete, UseGuards, Param } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ProfilesService } from '../services/profiles.service.js'
import { CreateProfileDto } from '../../auth/dto/profile.dto.js'

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

  @Delete(':userId')
  delete(@Param('userId') userId: number) {
    return this.profilesService.delete(userId)
  }
}
