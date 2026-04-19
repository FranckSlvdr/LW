-- 015_train_history_indexes.sql
-- Accelerates train history lookups used by /trains and /api/trains.
-- The query orders by created_at DESC and limits to the most recent runs.

CREATE INDEX IF NOT EXISTS idx_train_runs_created_at
  ON train_runs (created_at DESC);
