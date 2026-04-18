-- ============================================================================
-- Migration 013 — Desert Storm : gestion par équipes
-- Last War Tracker
--
-- Remplace le suivi de scores par un système d'inscription par équipes.
-- Deux équipes (A et B), 20 titulaires + 10 remplaçants chacune.
-- Suit la présence et le top-3 par équipe (sans points).
--
-- La table desert_storm_scores est conservée pour la compatibilité
-- avec la sélection des conducteurs de train (findTopDsScorers).
-- ============================================================================

CREATE TABLE IF NOT EXISTS desert_storm_registrations (
  id         SERIAL PRIMARY KEY,
  week_id    INTEGER NOT NULL,
  player_id  INTEGER NOT NULL,
  team       CHAR(1) NOT NULL,
  role       TEXT    NOT NULL,
  present    BOOLEAN NOT NULL DEFAULT TRUE,
  top3_rank  INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ds_reg_player_fk FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
  CONSTRAINT ds_reg_week_fk   FOREIGN KEY (week_id)   REFERENCES weeks   (id) ON DELETE CASCADE,
  CONSTRAINT ds_reg_team_check CHECK (team IN ('A', 'B')),
  CONSTRAINT ds_reg_role_check CHECK (role IN ('titulaire', 'remplaçant')),
  CONSTRAINT ds_reg_top3_check CHECK (top3_rank IS NULL OR top3_rank BETWEEN 1 AND 3),
  CONSTRAINT ds_reg_unique     UNIQUE (player_id, week_id)
);

CREATE INDEX IF NOT EXISTS idx_ds_reg_week ON desert_storm_registrations (week_id, team);
