-- Migration: Update users table schema to match Paysmart data model
-- Run this script against the paysmart_db database

-- Drop existing enum types if they exist (to allow re-creation)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    DROP TYPE role_enum CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status_enum') THEN
    DROP TYPE kyc_status_enum CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyb_status_enum') THEN
    DROP TYPE kyb_status_enum CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type_enum') THEN
    DROP TYPE document_type_enum CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_status_enum') THEN
    DROP TYPE wallet_status_enum CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
    DROP TYPE user_status_enum CASCADE;
  END IF;
END $$;

-- Create enums
CREATE TYPE role_enum AS ENUM ('USER', 'MERCHANT', 'ADMIN');
CREATE TYPE kyc_status_enum AS ENUM ('NON_VERIFIE', 'EN_COURS', 'VERIFIE', 'REJECTED', 'APPROVED');
CREATE TYPE kyb_status_enum AS ENUM ('NON_VERIFIE', 'EN_COURS', 'VERIFIE', 'REJECTED', 'APPROVED');
CREATE TYPE document_type_enum AS ENUM ('CIN', 'PASSPORT', 'KBIS', 'NIF', 'RIB', 'ADDRESS_PROOF', 'PHOTO_ID');
CREATE TYPE wallet_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_VERIFICATION');

-- Drop the old tables if they exist and recreate them
-- WARNING: This will delete all existing data
DROP TABLE IF EXISTS kyb_documents CASCADE;
DROP TABLE IF EXISTS kyc_documents CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with new schema
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  cin VARCHAR(255) UNIQUE,
  phone VARCHAR(255),
  date_of_birth DATE,
  avatar_url VARCHAR(500),
  role role_enum NOT NULL DEFAULT 'USER',
  kyc_status kyc_status_enum NOT NULL DEFAULT 'NON_VERIFIE',
  kyb_status kyb_status_enum NOT NULL DEFAULT 'NON_VERIFIE',
  account_status user_status_enum NOT NULL DEFAULT 'ACTIVE',
  suspension_reason TEXT,
  suspended_at TIMESTAMP,
  deleted_at TIMESTAMP,
  reactivation_deadline TIMESTAMP,
  revalidated_at TIMESTAMP,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  security_metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  postal_code VARCHAR(255),
  id_number VARCHAR(255),
  id_type VARCHAR(255),
  id_expiry_date DATE,
  company_name VARCHAR(255),
  siren_nif VARCHAR(255),
  trade_register VARCHAR(255),
  company_address TEXT,
  company_rib VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create wallets table
CREATE TABLE wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  wallet_number VARCHAR(255) UNIQUE NOT NULL,
  card_number VARCHAR(19) UNIQUE NOT NULL,
  card_holder_name VARCHAR(255) NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  daily_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
  monthly_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
  status wallet_status_enum NOT NULL DEFAULT 'ACTIVE',
  currency VARCHAR(3),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create KYC documents table
CREATE TABLE kyc_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type document_type_enum NOT NULL,
  document_url TEXT NOT NULL,
  document_hash VARCHAR(255),
  ocr_data TEXT,
  ai_trust_score INTEGER,
  status kyc_status_enum NOT NULL DEFAULT 'EN_COURS',
  rejection_reason TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create KYB documents table
CREATE TABLE kyb_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type document_type_enum NOT NULL,
  document_url TEXT NOT NULL,
  document_hash VARCHAR(255),
  ocr_data TEXT,
  ai_risk_score INTEGER,
  status kyb_status_enum NOT NULL DEFAULT 'EN_COURS',
  rejection_reason TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create refresh_tokens table
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TYPE payment_channel_enum AS ENUM ('MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'CARD', 'QR', 'BANK_TRANSFER');
CREATE TYPE transaction_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  sender_wallet_id INTEGER NOT NULL REFERENCES wallets(id),
  recipient_wallet_id INTEGER NOT NULL REFERENCES wallets(id),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  channel payment_channel_enum NOT NULL,
  status transaction_status_enum NOT NULL DEFAULT 'PENDING',
  external_reference VARCHAR(120),
  failure_reason TEXT,
  metadata JSONB,
  risk_score DECIMAL(5,2),
  risk_level VARCHAR(20),
  idempotency_key VARCHAR(120) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ledgers (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  wallet_id INTEGER NOT NULL REFERENCES wallets(id),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  direction VARCHAR(10) NOT NULL,
  entry_reference VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  link VARCHAR(500)
);

CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_type VARCHAR(50) NOT NULL,
  last_four_digits VARCHAR(120),
  brand VARCHAR(120),
  expiry_date VARCHAR(255),
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fraud_alerts (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  risk_level VARCHAR(20) NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL,
  reasons TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  admin_notes TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE device_fingerprints (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  fingerprint_hash VARCHAR(255) NOT NULL,
  device_name VARCHAR(120),
  browser VARCHAR(120),
  os VARCHAR(120),
  ip_address VARCHAR(64),
  metadata JSONB,
  is_trusted BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE otp_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  transaction_id INTEGER,
  code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMP,
  ip_address VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE security_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(120) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyb_documents_user_id ON kyb_documents(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX idx_security_rules_rule_type ON security_rules(rule_type);
CREATE INDEX idx_transactions_risk_score ON transactions(risk_score);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);
