import { Controller, Get, Param, UseGuards, Body, Patch, Delete, UsePipes, ValidationPipe, Query, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { UsersService } from '../services/users.service.js'
import { RolesGuard } from '../../common/guards/roles.guard.js'
import { Roles } from '../../common/decorators/roles.decorator.js'
import { UpdateRoleDto } from '../dto/update-role.dto.js'
import { Role } from '../../modules/auth/enums/role.enum.js'

interface RequestWithUser extends Request {
  user: { userId: string; email: string; role: string }
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(page, limit)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(parseInt(id))
  }

  @Patch(':id/role')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(parseInt(id), dto.role.toUpperCase() as Role)
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.usersService.delete(parseInt(id))
    return { message: 'Utilisateur supprimé' }
  }
}
