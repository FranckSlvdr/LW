-- 012_player_general_level.sql
-- Adds general_level to players table for CSV import support

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS general_level INTEGER CHECK (general_level BETWEEN 1 AND 99);
