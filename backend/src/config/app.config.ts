export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'paysmart_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'local-development-jwt-secret-change-me-32',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'local-development-refresh-secret-change-32',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
      ...Array.from({ length: 6 }, (_, index) => `http://localhost:${5173 + index}`),
      ...Array.from({ length: 6 }, (_, index) => `http://127.0.0.1:${5173 + index}`),
    ],
    credentials: true,
  },
})
