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
      // Split SQL by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      for (const statement of statements) {
        if (statement && !statement.startsWith('--')) {
          await queryRunner.query(statement)
        }
      }

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
