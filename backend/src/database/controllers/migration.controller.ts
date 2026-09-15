import { Controller, Post, HttpCode, HttpStatus, Get } from '@nestjs/common'
import { MigrationService } from '../services/migration.service.js'

@Controller('database')
export class MigrationController {
  constructor(private migrationService: MigrationService) {}

  @Post('migrate')
  @HttpCode(HttpStatus.OK)
  async runMigration() {
    return this.migrationService.runMigration()
  }

  @Get('migrate/status')
  async getMigrationStatus() {
    return {
      message: 'Endpoint pour vérifier le statut de la base de données',
    }
  }
}
