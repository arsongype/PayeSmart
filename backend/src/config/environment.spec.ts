import { describe, expect, it } from 'vitest'
import { validateProductionEnvironment } from './environment.js'

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DB_HOST: 'postgres.example',
  DB_USERNAME: 'paysmart',
  DB_PASSWORD: 'e'.repeat(32),
  DB_NAME: 'paysmart',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ENCRYPTION_KEY: 'c'.repeat(32),
  AI_API_KEY: 'd'.repeat(32),
}

describe('production environment validation', () => {
  it('accepts configured production credentials', () => {
    expect(() => validateProductionEnvironment(validProductionEnvironment)).not.toThrow()
  })

  it('rejects missing and placeholder production secrets without exposing their values', () => {
    const environment = { ...validProductionEnvironment, JWT_SECRET: 'your-secret-key-change-in-production' }
    delete environment.AI_API_KEY

    expect(() => validateProductionEnvironment(environment)).toThrow(/AI_API_KEY/)
    expect(() => validateProductionEnvironment(environment)).toThrow(/JWT_SECRET/)
    expect(() => validateProductionEnvironment(environment)).not.toThrow(/your-secret-key/)
  })

  it('rejects a placeholder database password in production', () => {
    expect(() => validateProductionEnvironment({
      ...validProductionEnvironment,
      DB_PASSWORD: 'replace-with-your-local-database-password',
    })).toThrow(/DB_PASSWORD/)
  })

  it('does not require production credentials for local development', () => {
    expect(() => validateProductionEnvironment({ NODE_ENV: 'development' })).not.toThrow()
  })
})
