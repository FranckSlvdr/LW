-- VS Eco Days — alliance-level eco flag per week/day
--
-- Eco days are defined at the alliance level: when a day is marked eco,
-- ALL player scores are capped at ECO_SCORE_CAP (7,200,000) for calculations.
-- Raw scores in daily_scores are NEVER modified.
--
-- This table replaces the per-player is_eco flag logic in daily_scores.
-- The daily_scores.is_eco column is kept for backward compatibility but
-- is no longer updated by the application (it retains historical values).

CREATE TABLE vs_days (
  id          SERIAL PRIMARY KEY,
  week_id     INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  is_eco      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_id, day_of_week)
);

CREATE INDEX idx_vs_days_week ON vs_days (week_id);
