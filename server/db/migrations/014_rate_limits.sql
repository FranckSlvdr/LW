-- 014_rate_limits.sql
-- Shared rate limiting storage for auth and mutation endpoints.
-- Stores only hashed identifiers to avoid persisting raw IP addresses.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  namespace        TEXT        NOT NULL,
  identifier_hash  TEXT        NOT NULL,
  window_start     TIMESTAMPTZ NOT NULL,
  window_ms        INTEGER     NOT NULL CHECK (window_ms > 0),
  hits             INTEGER     NOT NULL DEFAULT 0 CHECK (hits >= 0),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (namespace, identifier_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at
  ON api_rate_limits (updated_at);
