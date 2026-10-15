export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN
const relativeApiOrigin = typeof window !== 'undefined'
  ? (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3000` : window.location.origin)
  : ''
export const API_ORIGIN = configuredApiOrigin || API_BASE_URL.replace(/\/api\/v1\/?$/, '') || relativeApiOrigin
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
