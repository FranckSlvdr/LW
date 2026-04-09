-- ============================================================================
-- Migration 001 — Initial schema
-- Last War Tracker
--
-- Run this migration once against your PostgreSQL database.
-- All tables are created with IF NOT EXISTS for idempotence.
-- ============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- future: fuzzy player name search

-- ─── Players ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS players (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(100) NOT NULL,
  alias           VARCHAR(100),
  joined_at       DATE,
  left_at         DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT players_name_unique        UNIQUE (name),
  CONSTRAINT players_normalized_unique  UNIQUE (normalized_name),
  CONSTRAINT players_dates_check        CHECK (left_at IS NULL OR left_at > joined_at)
);

CREATE INDEX IF NOT EXISTS idx_players_normalized_name ON players (normalized_name);
CREATE INDEX IF NOT EXISTS idx_players_is_active       ON players (is_active);

-- ─── Weeks ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weeks (
  id          SERIAL PRIMARY KEY,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  label       VARCHAR(50) NOT NULL,
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT weeks_start_unique     UNIQUE (start_date),
  CONSTRAINT weeks_dates_check      CHECK (end_date > start_date),
  -- VS weeks always span 6 days (Monday → Saturday)
  CONSTRAINT weeks_span_check       CHECK ((end_date - start_date) = 5)
);

CREATE INDEX IF NOT EXISTS idx_weeks_start_date ON weeks (start_date DESC);

-- ─── Daily Scores ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_scores (
  id           SERIAL PRIMARY KEY,
  player_id    INTEGER NOT NULL,
  week_id      INTEGER NOT NULL,
  day_of_week  SMALLINT NOT NULL,
  score        BIGINT NOT NULL DEFAULT 0,
  is_eco       BOOLEAN NOT NULL DEFAULT FALSE,
  source       VARCHAR(20) NOT NULL DEFAULT 'manual',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_scores_player_fk  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
  CONSTRAINT daily_scores_week_fk    FOREIGN KEY (week_id)   REFERENCES weeks   (id) ON DELETE CASCADE,
  CONSTRAINT daily_scores_day_check  CHECK (day_of_week BETWEEN 1 AND 6),
  CONSTRAINT daily_scores_score_check CHECK (score >= 0),
  CONSTRAINT daily_scores_source_check CHECK (source IN ('manual', 'csv')),
  CONSTRAINT daily_scores_unique     UNIQUE (player_id, week_id, day_of_week)
);

-- Primary lookup: fetch all scores for a week (dashboard, KPI engine)
CREATE INDEX IF NOT EXISTS idx_daily_scores_week_player ON daily_scores (week_id, player_id);
-- Secondary: fetch all scores for a player across weeks
CREATE INDEX IF NOT EXISTS idx_daily_scores_player_week ON daily_scores (player_id, week_id);

-- ─── Rating Rules ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rating_rules (
  id          SERIAL PRIMARY KEY,
  rule_key    VARCHAR(50) NOT NULL,
  label       VARCHAR(100),
  value       NUMERIC(10, 4) NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rating_rules_key_unique  UNIQUE (rule_key),
  CONSTRAINT rating_rules_value_check CHECK (value >= 0 AND value <= 1)
);

-- ─── Rating Runs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rating_runs (
  id             SERIAL PRIMARY KEY,
  label          VARCHAR(100) NOT NULL,
  week_id        INTEGER NOT NULL,
  rules_snapshot JSONB NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_active      BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_by   VARCHAR(100),
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rows_computed  INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT rating_runs_week_fk      FOREIGN KEY (week_id) REFERENCES weeks (id) ON DELETE RESTRICT,
  CONSTRAINT rating_runs_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Quickly find the active run for a given week
CREATE INDEX IF NOT EXISTS idx_rating_runs_week_active ON rating_runs (week_id, is_active);

-- ─── Player Ratings ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS player_ratings (
  id                SERIAL PRIMARY KEY,
  player_id         INTEGER NOT NULL,
  rating_run_id     INTEGER NOT NULL,
  raw_vs_score      NUMERIC(10, 4),
  regularity        NUMERIC(10, 4),
  participation     NUMERIC(10, 4),
  event_score       NUMERIC(10, 4),
  profession_score  NUMERIC(10, 4),
  bonus_malus       NUMERIC(10, 4) NOT NULL DEFAULT 0,
  final_score       NUMERIC(10, 4),
  rank              INTEGER,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT player_ratings_player_fk  FOREIGN KEY (player_id)     REFERENCES players     (id) ON DELETE CASCADE,
  CONSTRAINT player_ratings_run_fk     FOREIGN KEY (rating_run_id) REFERENCES rating_runs (id) ON DELETE CASCADE,
  CONSTRAINT player_ratings_unique     UNIQUE (player_id, rating_run_id),
  CONSTRAINT player_ratings_score_check CHECK (
    final_score IS NULL OR (final_score >= 0 AND final_score <= 100)
  )
);

-- Dashboard ranking lookup: get ordered ranking for a run
CREATE INDEX IF NOT EXISTS idx_player_ratings_run_rank ON player_ratings (rating_run_id, rank);
-- Player history lookup
CREATE INDEX IF NOT EXISTS idx_player_ratings_player   ON player_ratings (player_id);

-- ─── Imports ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS imports (
  id            SERIAL PRIMARY KEY,
  import_type   VARCHAR(20) NOT NULL,
  week_id       INTEGER,
  filename      VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  rows_total    INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_skipped  INTEGER NOT NULL DEFAULT 0,
  errors_json   JSONB,
  imported_by   VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT imports_week_fk     FOREIGN KEY (week_id) REFERENCES weeks (id) ON DELETE SET NULL,
  CONSTRAINT imports_type_check  CHECK (import_type IN ('players', 'scores')),
  CONSTRAINT imports_status_check CHECK (status IN ('pending', 'success', 'partial', 'error')),
  CONSTRAINT imports_rows_check  CHECK (rows_imported + rows_skipped <= rows_total)
);

CREATE INDEX IF NOT EXISTS idx_imports_created_at  ON imports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imports_type_status ON imports (import_type, status);

-- ─── Import Rows ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_rows (
  id                   SERIAL PRIMARY KEY,
  import_id            INTEGER NOT NULL,
  row_number           INTEGER NOT NULL,
  raw_data_json        JSONB NOT NULL,
  normalized_data_json JSONB,
  status               VARCHAR(20) NOT NULL DEFAULT 'imported',
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT import_rows_import_fk    FOREIGN KEY (import_id) REFERENCES imports (id) ON DELETE CASCADE,
  CONSTRAINT import_rows_status_check CHECK (status IN ('imported', 'skipped', 'error')),
  CONSTRAINT import_rows_unique       UNIQUE (import_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_import_rows_import_id ON import_rows (import_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_status    ON import_rows (import_id, status);

-- ─── Future modules (structure in place, tables empty) ────────────────────────

CREATE TABLE IF NOT EXISTS event_participation (
  id           SERIAL PRIMARY KEY,
  player_id    INTEGER NOT NULL,
  event_name   VARCHAR(100) NOT NULL,
  event_date   DATE NOT NULL,
  score        BIGINT NOT NULL DEFAULT 0,
  participated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT event_participation_player_fk  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
  CONSTRAINT event_participation_score_check CHECK (score >= 0)
);

CREATE TABLE IF NOT EXISTS player_professions (
  id             SERIAL PRIMARY KEY,
  player_id      INTEGER NOT NULL,
  profession_key VARCHAR(50) NOT NULL,
  level          SMALLINT NOT NULL DEFAULT 1,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT player_professions_player_fk  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
  CONSTRAINT player_professions_level_check CHECK (level >= 1),
  CONSTRAINT player_professions_unique      UNIQUE (player_id)
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id           SERIAL PRIMARY KEY,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    INTEGER,
  action       VARCHAR(20) NOT NULL,
  before_json  JSONB,
  after_json   JSONB,
  performed_by VARCHAR(100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT audit_logs_action_check CHECK (action IN ('CREATE', 'UPDATE', 'DELETE'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity      ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON audit_logs (created_at DESC);

-- ─── Seed: rating rules defaults ─────────────────────────────────────────────

INSERT INTO rating_rules (rule_key, label, value, description) VALUES
  ('weight_vs_score',        'Poids score VS',      0.55, 'Part du score VS brut normalisé dans la note globale'),
  ('weight_regularity',      'Poids régularité',    0.25, 'Part de la régularité journalière dans la note globale'),
  ('weight_participation',   'Poids participation', 0.20, 'Part de la participation (jours joués / 6) dans la note globale'),
  ('weight_event_score',     'Poids événements',    0.00, 'Part des événements — module futur'),
  ('weight_profession_score','Poids profession',    0.00, 'Part du niveau de profession — module futur'),
  ('eco_score_multiplier',   'Multiplicateur éco',  0.50, 'Coefficient appliqué aux scores des jours éco')
ON CONFLICT (rule_key) DO NOTHING;
