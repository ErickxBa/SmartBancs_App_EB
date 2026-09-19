-- Habilitar generación de UUIDs nativos en PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_name  VARCHAR(200) NOT NULL,
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Restricción a nivel de motor: garantiza integridad financiera absoluta
  CONSTRAINT balance_positive CHECK (balance >= 0)
);

CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_from    UUID NOT NULL REFERENCES accounts(id),
  account_to      UUID NOT NULL REFERENCES accounts(id),
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  trace_id        VARCHAR(64),
  recommendation  TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices críticos exigidos para evitar Full Table Scans durante validaciones históricas
CREATE INDEX idx_tx_account_from ON transactions(account_from, created_at DESC);
CREATE INDEX idx_tx_account_to   ON transactions(account_to, created_at DESC);