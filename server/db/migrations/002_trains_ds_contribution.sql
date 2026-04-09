-- ============================================================================
-- Migration 002 — Desert Storm, Contribution, Train management
-- Last War Tracker
--
-- Run ONCE against your PostgreSQL database after migration 001.
-- All CREATE TABLE use IF NOT EXISTS for idempotence.
-- ============================================================================

-- ─── Desert Storm scores ─────────────────────────────────────────────────────
-- One score per player per VS week (replaces event_participation for the main UI)

CREATE TABLE IF NOT EXISTS desert_storm_scores (
  id          SERIAL PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  week_id     INTEGER NOT NULL,
  score       BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ds_scores_player_fk  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE RESTRICT,
  CONSTRAINT ds_scores_week_fk    FOREIGN KEY (week_id)   REFERENCES weeks   (id) ON DELETE RESTRICT,
  CONSTRAINT ds_scores_score_check CHECK (score >= 0),
  CONSTRAINT ds_scores_unique     UNIQUE (player_id, week_id)
);

CREATE INDEX IF NOT EXISTS idx_ds_scores_week   ON desert_storm_scores (week_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_ds_scores_player ON desert_storm_scores (player_id);

-- ─── Contributions ────────────────────────────────────────────────────────────
-- One contribution amount per player per VS week

CREATE TABLE IF NOT EXISTS contributions (
  id          SERIAL PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  week_id     INTEGER NOT NULL,
  amount      BIGINT NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT contributions_player_fk   FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE RESTRICT,
  CONSTRAINT contributions_week_fk     FOREIGN KEY (week_id)   REFERENCES weeks   (id) ON DELETE RESTRICT,
  CONSTRAINT contributions_amount_check CHECK (amount >= 0),
  CONSTRAINT contributions_unique      UNIQUE (player_id, week_id)
);

CREATE INDEX IF NOT EXISTS idx_contributions_week   ON contributions (week_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_contributions_player ON contributions (player_id);

-- ─── Train settings (singleton) ───────────────────────────────────────────────
-- One row, always id = 1. Use ON CONFLICT to update.

CREATE TABLE IF NOT EXISTS train_settings (
  id                        SERIAL PRIMARY KEY,
  exclusion_window_weeks    SMALLINT NOT NULL DEFAULT 1,
  include_ds_top2           BOOLEAN  NOT NULL DEFAULT TRUE,
  include_best_contributor  BOOLEAN  NOT NULL DEFAULT TRUE,
  total_drivers_per_day     SMALLINT NOT NULL DEFAULT 4,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT train_settings_exclusion_check CHECK (exclusion_window_weeks BETWEEN 0 AND 3),
  CONSTRAINT train_settings_drivers_check   CHECK (total_drivers_per_day  BETWEEN 1 AND 10)
);

INSERT INTO train_settings (id, exclusion_window_weeks, include_ds_top2, include_best_contributor, total_drivers_per_day)
VALUES (1, 1, TRUE, TRUE, 4)
ON CONFLICT (id) DO NOTHING;

-- ─── Train runs ───────────────────────────────────────────────────────────────
-- One run per (week, day). Stores a snapshot of settings + list of excluded player IDs.

CREATE TABLE IF NOT EXISTS train_runs (
  id                  SERIAL PRIMARY KEY,
  week_id             INTEGER  NOT NULL,
  train_day           SMALLINT NOT NULL,  -- 1 = Monday … 7 = Sunday
  settings_snapshot   JSONB    NOT NULL,  -- copy of train_settings at run time
  excluded_player_ids JSONB    NOT NULL DEFAULT '[]', -- [{playerId, weeksAgo}]
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT train_runs_week_fk    FOREIGN KEY (week_id) REFERENCES weeks (id) ON DELETE RESTRICT,
  CONSTRAINT train_runs_day_check  CHECK (train_day BETWEEN 1 AND 7),
  CONSTRAINT train_runs_unique     UNIQUE (week_id, train_day)
);

CREATE INDEX IF NOT EXISTS idx_train_runs_week ON train_runs (week_id, train_day);

-- ─── Train selections ─────────────────────────────────────────────────────────
-- Which players were selected for a run and why.

CREATE TABLE IF NOT EXISTS train_selections (
  id               SERIAL PRIMARY KEY,
  run_id           INTEGER  NOT NULL,
  player_id        INTEGER  NOT NULL,
  position         SMALLINT NOT NULL,
  selection_reason VARCHAR(30) NOT NULL,

  CONSTRAINT train_selections_run_fk      FOREIGN KEY (run_id)    REFERENCES train_runs (id) ON DELETE CASCADE,
  CONSTRAINT train_selections_player_fk   FOREIGN KEY (player_id) REFERENCES players    (id) ON DELETE RESTRICT,
  CONSTRAINT train_selections_reason_check CHECK (selection_reason IN ('ds_top_scorer', 'best_contributor', 'random', 'manual')),
  CONSTRAINT train_selections_run_player  UNIQUE (run_id, player_id),
  CONSTRAINT train_selections_run_pos     UNIQUE (run_id, position)
);

CREATE INDEX IF NOT EXISTS idx_train_selections_run    ON train_selections (run_id);
CREATE INDEX IF NOT EXISTS idx_train_selections_player ON train_selections (player_id);
