-- 010_performance_indexes.sql
-- Additive performance indexes — no data changes, no schema changes.
-- All indexes use IF NOT EXISTS for idempotence.
--
-- NOTE: The following indexes already exist and are NOT duplicated here:
--   users(role)                           → users_role_idx          (006)
--   daily_scores(week_id, player_id)      → idx_daily_scores_week_player (001)
--   train_runs(week_id, train_day)        → idx_train_runs_week     (002)
--   desert_storm_scores(week_id, score)   → idx_ds_scores_week      (002)
--   contributions(week_id, amount)        → idx_contributions_week  (002)

-- ─── Audit log filtering ──────────────────────────────────────────────────────
--
-- The audit page always orders by created_at DESC and may filter by action
-- and/or entity_type.  The existing idx_audit_logs_created_at covers ordering
-- only; idx_audit_logs_entity covers (entity_type, entity_id) but not ordering.
-- These composite indexes let PostgreSQL satisfy both filter + ORDER BY in one
-- index range scan instead of a full table scan + sort.

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time
  ON audit_logs (action, created_at DESC);

-- entity_type is filtered independently of entity_id on the audit page
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_time
  ON audit_logs (entity_type, created_at DESC);

-- user_id filter: admin-side per-user history lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time
  ON audit_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ─── Active player lookup ─────────────────────────────────────────────────────
--
-- findAllPlayers(activeOnly=true) is called on almost every page.
-- The existing idx_players_is_active is a full-table boolean index with low
-- selectivity.  A partial index only indexes active rows, making it more
-- selective and smaller as the player list grows over time.
-- Includes current_rank + name to cover the ORDER BY expression.

CREATE INDEX IF NOT EXISTS idx_players_active_sort
  ON players (current_rank, name)
  WHERE is_active = TRUE;
