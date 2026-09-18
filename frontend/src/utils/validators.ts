import { z } from 'zod'

export const emailSchema = z.string().email('Email invalide')
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
export const nameSchema = z.string().min(2, 'Le nom doit contenir au moins 2 caractères')
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Numéro de téléphone invalide')
  .optional()
export const cinSchema = z
  .string()
  .regex(/^\d{8,12}$/, 'CIN invalide (8 à 12 chiffres)')
  .optional()
export const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)')
  .optional()
export const roleSchema = z.enum(['USER', 'MERCHANT', 'ADMIN']).optional()

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  cin: cinSchema,
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
  address: z.string().min(3, 'Adresse requise'),
  city: z.string().min(2, 'Ville requise'),
  country: z.string().min(2, 'Pays requis'),
  postalCode: z.string().min(3, 'Code postal requis'),
  role: roleSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6, 'Le code OTP doit contenir 6 chiffres'),
})

export const enableTwoFactorSchema = z.object({
  otp: z.string().length(6, 'Le code OTP doit contenir 6 chiffres'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>
export type EnableTwoFactorFormData = z.infer<typeof enableTwoFactorSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
