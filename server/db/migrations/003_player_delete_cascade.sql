-- ============================================================================
-- Migration 003 — Allow hard-deleting players
-- Last War Tracker
--
-- Changes ON DELETE RESTRICT → CASCADE for the three player FKs introduced
-- in migration 002 (desert_storm_scores, contributions, train_selections).
-- Migration 001 already used CASCADE for daily_scores, player_ratings,
-- event_participations, and player_professions — no changes needed there.
--
-- Run ONCE after migration 002.
-- ============================================================================

ALTER TABLE desert_storm_scores
  DROP CONSTRAINT IF EXISTS ds_scores_player_fk,
  ADD CONSTRAINT  ds_scores_player_fk
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE;

ALTER TABLE contributions
  DROP CONSTRAINT IF EXISTS contributions_player_fk,
  ADD CONSTRAINT  contributions_player_fk
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE;

ALTER TABLE train_selections
  DROP CONSTRAINT IF EXISTS train_selections_player_fk,
  ADD CONSTRAINT  train_selections_player_fk
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE;
