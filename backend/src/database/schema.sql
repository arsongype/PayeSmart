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
END $$;

-- Create enums
CREATE TYPE role_enum AS ENUM ('USER', 'MERCHANT', 'ADMIN');
CREATE TYPE kyc_status_enum AS ENUM ('NON_VERIFIE', 'EN_COURS', 'VERIFIE', 'REJECTED', 'APPROVED');
CREATE TYPE kyb_status_enum AS ENUM ('NON_VERIFIE', 'EN_COURS', 'VERIFIE', 'REJECTED', 'APPROVED');
CREATE TYPE document_type_enum AS ENUM ('CIN', 'PASSPORT', 'KBIS', 'NIF', 'RIB', 'ADDRESS_PROOF', 'PHOTO_ID');
CREATE TYPE wallet_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

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
  role role_enum NOT NULL DEFAULT 'USER',
  kyc_status kyc_status_enum NOT NULL DEFAULT 'NON_VERIFIE',
  kyb_status kyb_status_enum NOT NULL DEFAULT 'NON_VERIFIE',
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
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

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyb_documents_user_id ON kyb_documents(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
