const productionSecretNames = ['DB_PASSWORD', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'AI_API_KEY'] as const
const productionRequiredNames = ['DB_HOST', 'DB_USERNAME', 'DB_NAME', ...productionSecretNames] as const

export function validateProductionEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.NODE_ENV !== 'production') return

  const missing = productionRequiredNames.filter((name) => !environment[name]?.trim())
  const weakSecrets = productionSecretNames.filter((name) => {
    const secret = environment[name]?.trim() ?? ''
    return secret.length < 32 || /^(replace-with|your-|dev-)/i.test(secret)
  })

  if (missing.length > 0 || weakSecrets.length > 0) {
    const details = [
      missing.length > 0 ? `missing: ${missing.join(', ')}` : '',
      weakSecrets.length > 0 ? `must be replaced with random values of at least 32 characters: ${weakSecrets.join(', ')}` : '',
    ].filter(Boolean).join('; ')
    throw new Error(`Invalid production environment (${details})`)
  }
}
