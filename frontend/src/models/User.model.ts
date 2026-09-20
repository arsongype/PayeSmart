export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'MERCHANT' | 'ADMIN';
  kycStatus: 'NON_VERIFIE' | 'EN_COURS' | 'VERIFIE' | 'REJECTED' | 'APPROVED';
  kybStatus: 'NON_VERIFIE' | 'EN_COURS' | 'VERIFIE' | 'REJECTED' | 'APPROVED';
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'DELETED' | 'PENDING_VERIFICATION';
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  deletedAt?: string | null;
  reactivationDeadline?: string | null;
  cin?: string;
  phone?: string;
  dateOfBirth?: string;
  avatarUrl?: string | null;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  isEmailVerified: boolean;
  profile?: Profile;
  wallet?: Wallet;
  kycDocuments?: KycDocument[];
  kybDocuments?: KybDocument[];
  createdAt?: string;
}

export interface Profile {
  id: number;
  userId: number;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  idNumber?: string;
  idType?: string;
  idExpiryDate?: string;
  companyName?: string;
  sirenNif?: string;
  tradeRegister?: string;
  companyAddress?: string;
  companyRib?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Wallet {
  id: number;
  userId: number;
  walletNumber: string;
  cardNumber?: string;
  cardHolderName?: string;
  balance: number;
  dailyLimit: number;
  monthlyLimit: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  currency?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface KycDocument {
  id: number;
  userId: number;
  documentType: 'CIN' | 'PASSPORT' | 'KBIS' | 'NIF' | 'RIB' | 'ADDRESS_PROOF' | 'PHOTO_ID';
  documentUrl: string;
  documentHash?: string;
  ocrData?: string;
  aiTrustScore?: number;
  status: 'NON_VERIFIE' | 'EN_COURS' | 'VERIFIE' | 'REJECTED' | 'APPROVED';
  rejectionReason?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface KybDocument {
  id: number;
  userId: number;
  documentType: 'CIN' | 'PASSPORT' | 'KBIS' | 'NIF' | 'RIB' | 'ADDRESS_PROOF' | 'PHOTO_ID';
  documentUrl: string;
  documentHash?: string;
  ocrData?: string;
  aiRiskScore?: number;
  status: 'NON_VERIFIE' | 'EN_COURS' | 'VERIFIE' | 'REJECTED' | 'APPROVED';
  rejectionReason?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  confirmPassword: string;
  firstName: string;
  lastName: string;
  cin?: string;
  phone?: string;
  dateOfBirth?: string;
  role?: 'USER' | 'MERCHANT' | 'ADMIN';
}

export interface RefreshTokenPayload {
  refreshToken: string;
}
