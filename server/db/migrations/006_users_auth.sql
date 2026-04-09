-- 006_users_auth.sql
-- Real per-user authentication: users table, credentials table, audit_logs extension

-- ─── User roles ───────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'viewer');

-- ─── Users (identity) ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  role       user_role NOT NULL DEFAULT 'viewer',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx  ON users (role);

-- ─── User credentials (security secrets — never returned in API responses) ────

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id           UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  -- bcrypt hash of the password, NULL until the user sets one (invite flow)
  password_hash     TEXT,
  -- Increment on logout / password change / deactivation to invalidate JWTs
  token_version     INTEGER NOT NULL DEFAULT 0,
  -- SHA-256 hex of the raw invite token (raw token only ever in email/URL)
  invite_token_hash TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  invite_accepted   BOOLEAN NOT NULL DEFAULT FALSE,
  -- SHA-256 hex of the raw reset token
  reset_token_hash  TEXT UNIQUE,
  reset_expires_at  TIMESTAMPTZ,
  -- Future: TOTP secret (encrypted at rest via app-level encryption)
  mfa_secret        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Extend audit_logs with user context ──────────────────────────────────────

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_id    UUID REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET;

-- Extend the action CHECK constraint to include auth events
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_action_check
    CHECK (action IN (
      'CREATE', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'INVITE_SENT', 'INVITE_ACCEPTED',
      'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED',
      'USER_DEACTIVATED', 'USER_ACTIVATED',
      'ROLE_CHANGED'
    ));

-- ─── Triggers for updated_at ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
