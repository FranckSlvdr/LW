-- ============================================================================
-- Migration 005 — Add 'ocr' to daily_scores.source
-- Last War Tracker
--
-- Extends the source column check constraint to allow 'ocr' as a valid
-- import source for scores extracted from screenshots.
-- Run ONCE after migration 004.
-- ============================================================================

ALTER TABLE daily_scores
  DROP CONSTRAINT IF EXISTS daily_scores_source_check,
  ADD  CONSTRAINT daily_scores_source_check
    CHECK (source IN ('manual', 'csv', 'ocr'));
