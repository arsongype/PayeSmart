import 'reflect-metadata'
import { Client } from 'pg'
import { config } from 'dotenv'

config({ path: '.env' })

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'arson',
  database: process.env.DB_NAME || 'paysmart_db',
})

const statements = [
  `DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_VERIFICATION');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status user_status_enum NOT NULL DEFAULT 'ACTIVE'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reactivation_deadline TIMESTAMP`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS revalidated_at TIMESTAMP`,
  `CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)`,
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS card_number VARCHAR(19)`,
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS card_holder_name VARCHAR(255)`,
  `UPDATE wallets w SET card_number = '5399' || LPAD(w.user_id::text, 12, '0') WHERE w.card_number IS NULL`,
  `UPDATE wallets w SET card_holder_name = UPPER(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))) FROM users u WHERE u.id = w.user_id AND w.card_holder_name IS NULL`,
  `ALTER TABLE wallets ALTER COLUMN card_number SET NOT NULL`,
  `ALTER TABLE wallets ALTER COLUMN card_holder_name SET NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_card_number ON wallets(card_number)`,
  `UPDATE wallets SET wallet_number = LPAD(user_id::text, 8, '0') || LPAD(user_id::text, 4, '0') WHERE wallet_number !~ '^[0-9]+$'`,
  `DO $$ BEGIN CREATE TYPE payment_channel_enum AS ENUM ('MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'CARD', 'QR', 'BANK_TRANSFER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE transaction_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, sender_wallet_id INTEGER NOT NULL REFERENCES wallets(id), recipient_wallet_id INTEGER NOT NULL REFERENCES wallets(id), amount DECIMAL(15,2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'EUR', channel payment_channel_enum NOT NULL, status transaction_status_enum NOT NULL DEFAULT 'PENDING', external_reference VARCHAR(120), failure_reason TEXT, metadata JSONB, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS ledgers (id SERIAL PRIMARY KEY, transaction_id INTEGER NOT NULL REFERENCES transactions(id), wallet_id INTEGER NOT NULL REFERENCES wallets(id), amount DECIMAL(15,2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'EUR', direction VARCHAR(10) NOT NULL, entry_reference VARCHAR(120) NOT NULL UNIQUE, created_at TIMESTAMP NOT NULL DEFAULT NOW())`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_wallet_id INTEGER`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recipient_wallet_id INTEGER`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR'`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS channel payment_channel_enum NOT NULL DEFAULT 'CARD'`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status transaction_status_enum NOT NULL DEFAULT 'PENDING'`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_reference VARCHAR(120)`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,
  `ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS transaction_id INTEGER`,
  `ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS wallet_id INTEGER`,
  `ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR'`,
  `ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'DEBIT'`,
  `ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS entry_reference VARCHAR(120)`,
  `ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()`,
  `ALTER TABLE transactions ALTER COLUMN sender_user_id DROP NOT NULL`,
  `ALTER TABLE transactions ALTER COLUMN payment_method DROP NOT NULL`,
  `ALTER TABLE transactions ALTER COLUMN recipient_user_id DROP NOT NULL`,
  `ALTER TABLE ledgers ALTER COLUMN balance_after DROP NOT NULL`,
]

async function runMigration() {
  await client.connect()
  try {
    await client.query('BEGIN')
    for (const statement of statements) {
      await client.query(statement)
    }
    await client.query('COMMIT')
    console.log('Migration additive appliquée avec succès')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Erreur de migration additive:', error)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

runMigration().catch((error) => {
  console.error('Impossible de joindre PostgreSQL:', error)
  process.exitCode = 1
})
