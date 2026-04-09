-- 007_player_ranks.sql
-- Adds rank management columns to the players table.
-- Purely additive — no existing data is modified or removed.
--
-- Rank semantics:
--   R5 = Leader
--   R4 = Supervisors / Officers
--   R3 = Active members
--   R2 = Occasional members
--   R1 = Inactive / under review
--
-- current_rank  = rank actually assigned by leadership (NULL = unclassified)
-- suggested_rank = rank recommended by the app engine (NULL = no recommendation yet)
-- rank_reason    = short explanation from the engine for suggested_rank

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS current_rank   VARCHAR(2) CHECK (current_rank   IN ('R1','R2','R3','R4','R5')),
  ADD COLUMN IF NOT EXISTS suggested_rank VARCHAR(2) CHECK (suggested_rank IN ('R1','R2','R3','R4','R5')),
  ADD COLUMN IF NOT EXISTS rank_reason    TEXT;

CREATE INDEX IF NOT EXISTS idx_players_current_rank ON players (current_rank);
