import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { User } from '../modules/auth/entities/user.entity.js'
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity.js'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

config({ path: '.env' })

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'arson',
  database: process.env.DB_NAME || 'paysmart_db',
  entities: [User, RefreshToken],
  synchronize: false,
})

async function runMigration() {
  try {
    await dataSource.initialize()
    console.log('Connexion à la base de données établie')

    const migrationPath = path.join(process.cwd(), 'src', 'database', 'schema.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    const queryRunner = dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement) {
          console.log('Exécution:', statement.substring(0, 50) + '...')
          await queryRunner.query(statement)
        }
      }

      await queryRunner.commitTransaction()
      console.log('✅ Migration appliquée avec succès')
    } catch (error) {
      await queryRunner.rollbackTransaction()
      console.error('❌ Erreur lors de la migration:', error)
      process.exit(1)
    } finally {
      await queryRunner.release()
      await dataSource.destroy()
    }
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error)
    process.exit(1)
  }
}

runMigration()
