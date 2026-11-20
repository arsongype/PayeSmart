import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // This service is used for manual migrations
  }

  async runMigration() {
    const migrationPath = path.join(process.cwd(), 'src', 'database', 'schema.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Execute the script as a whole so PostgreSQL dollar-quoted blocks stay intact.
      await queryRunner.query(sql)

      await queryRunner.commitTransaction()
      return { success: true, message: 'Migration appliquée avec succès' }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      return {
        success: false,
        message: 'Erreur lors de la migration',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      await queryRunner.release()
    }
  }
}
