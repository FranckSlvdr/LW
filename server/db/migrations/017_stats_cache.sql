-- ============================================================================
-- Migration 017 — Generic stats cache
--
-- Stores precomputed stats payloads (JSONB) keyed by a short identifier.
-- Initially used for cross-week alliance KPI stats computed daily by cron.
--
-- Design: key-value table to avoid proliferating dedicated snapshot tables
-- for each analytics feature. The payload is always typed at the service
-- layer; DB does not enforce the shape.
-- ============================================================================

CREATE TABLE IF NOT EXISTS stats_cache (
  key         TEXT         PRIMARY KEY,
  payload     JSONB        NOT NULL,
  computed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
