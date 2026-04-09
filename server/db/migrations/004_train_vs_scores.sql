-- ============================================================================
-- Migration 004 — VS score link in train settings
-- Last War Tracker
--
-- Adds vs_top_count and vs_top_days to train_settings so the train engine
-- can reserve slots for the top N VS scorers of the week (all days or
-- a specific subset of days).
--
-- Also extends the selection_reason CHECK to include 'vs_top_scorer'.
-- Run ONCE after migration 003.
-- ============================================================================

-- ─── train_settings: new columns ─────────────────────────────────────────────

ALTER TABLE train_settings
  ADD COLUMN IF NOT EXISTS vs_top_count SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vs_top_days  JSONB    NOT NULL DEFAULT '[]';

ALTER TABLE train_settings
  DROP CONSTRAINT IF EXISTS train_settings_vs_top_check,
  ADD  CONSTRAINT train_settings_vs_top_check
    CHECK (vs_top_count BETWEEN 0 AND 5);

-- Update the singleton row so the new columns are set
UPDATE train_settings SET vs_top_count = 0, vs_top_days = '[]' WHERE id = 1;

-- ─── train_selections: add 'vs_top_scorer' to reason check ───────────────────

ALTER TABLE train_selections
  DROP CONSTRAINT IF EXISTS train_selections_reason_check,
  ADD  CONSTRAINT train_selections_reason_check
    CHECK (selection_reason IN (
      'ds_top_scorer', 'best_contributor', 'random', 'manual', 'vs_top_scorer'
    ));
