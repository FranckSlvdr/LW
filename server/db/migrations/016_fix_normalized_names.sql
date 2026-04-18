-- Migration 016: Fix normalized_name for players whose name was corrupted
-- by the old ASCII-only normalizePlayerName function.
--
-- The old regex /[^a-z0-9\s]/g stripped every non-ASCII character,
-- leaving normalized_name = '' for Arabic, Chinese, Cyrillic, etc. players.
-- The new function uses /[^\p{L}\p{N}\s]/gu (Unicode-aware) and preserves
-- non-Latin scripts.
--
-- This migration recomputes normalized_name for all affected rows using
-- lower(trim(name)) which is the equivalent SQL expression: it preserves
-- non-Latin characters while normalizing case and whitespace.
-- (Full NFD diacritic stripping for Latin names is handled in the app layer
-- and is irrelevant for the affected rows, which are non-Latin.)

UPDATE players
SET normalized_name = lower(trim(name))
WHERE normalized_name = '';
