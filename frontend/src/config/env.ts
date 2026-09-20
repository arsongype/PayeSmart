export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Paysmart'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0'

export const env = {
  API_BASE_URL,
  API_ORIGIN,
  APP_NAME,
  APP_VERSION,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}
