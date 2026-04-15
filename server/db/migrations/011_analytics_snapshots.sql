-- ============================================================================
-- Migration 011 — Analytics precomputed tables
--
-- Three tables enable fast dashboard reads and richer KPI analytics:
--
--   week_kpi_snapshots  — full serialized DashboardSnapshot per week (JSONB)
--                         Read by the dashboard as a single fast query.
--                         Written once per recompute cycle, marked stale on
--                         score/player mutations, refreshed on next read.
--
--   week_member_stats   — structured per-player per-week KPIs.
--                         Enables rank distribution, player progression, and
--                         cross-week analytics without deserializing JSONB.
--
--   week_rank_stats     — per-rank-tier aggregated stats per week (R1..R5).
--                         Enables rank distribution analytics.
--
-- All tables use ON DELETE CASCADE from weeks / players.
-- ============================================================================

-- ─── Week KPI snapshots ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS week_kpi_snapshots (
  week_id     INTEGER PRIMARY KEY REFERENCES weeks(id) ON DELETE CASCADE,
  -- Serialized DashboardSnapshot: { summary, allKpis, prevKpis, playerRanks }
  payload     JSONB       NOT NULL,
  -- TRUE = stale, must be recomputed on next read
  stale       BOOLEAN     NOT NULL DEFAULT FALSE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup of stale snapshots by the cron refresher
CREATE INDEX IF NOT EXISTS idx_week_kpi_snapshots_stale
  ON week_kpi_snapshots (week_id) WHERE stale = TRUE;

-- ─── Per-player per-week stats ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS week_member_stats (
  week_id           INTEGER      NOT NULL REFERENCES weeks(id)   ON DELETE CASCADE,
  player_id         INTEGER      NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_name       TEXT         NOT NULL,
  player_alias      TEXT,
  current_rank      VARCHAR(10),                  -- alliance rank tier at snapshot time
  rank_position     INTEGER      NOT NULL,         -- VS rank (1st, 2nd…) for this week
  previous_rank     INTEGER,
  rank_trend        VARCHAR(10)  CHECK (rank_trend IN ('up', 'down', 'stable')),
  total_score       BIGINT       NOT NULL DEFAULT 0,
  raw_total_score   BIGINT       NOT NULL DEFAULT 0,
  days_played       SMALLINT     NOT NULL DEFAULT 0,
  participation_rate NUMERIC(5,4) NOT NULL DEFAULT 0,  -- 0.0000–1.0000
  daily_average     BIGINT       NOT NULL DEFAULT 0,
  eco_days          SMALLINT     NOT NULL DEFAULT 0,
  daily_scores      JSONB        NOT NULL DEFAULT '[]', -- DailyScoreApi[]
  computed_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (week_id, player_id)
);

-- Player progression across weeks (lookup by player + week desc)
CREATE INDEX IF NOT EXISTS idx_week_member_stats_player
  ON week_member_stats (player_id, week_id DESC);

-- Rank-tier-filtered queries within a week
CREATE INDEX IF NOT EXISTS idx_week_member_stats_rank_tier
  ON week_member_stats (week_id, current_rank, rank_position);

-- ─── Per-rank-tier aggregated stats ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS week_rank_stats (
  week_id           INTEGER      NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  current_rank      VARCHAR(20)  NOT NULL,   -- 'R5','R4','R3','R2','R1','unranked'
  member_count      INTEGER      NOT NULL DEFAULT 0,
  active_count      INTEGER      NOT NULL DEFAULT 0,  -- daysPlayed > 0
  total_score       BIGINT       NOT NULL DEFAULT 0,
  avg_score         BIGINT       NOT NULL DEFAULT 0,
  avg_participation NUMERIC(5,4) NOT NULL DEFAULT 0,
  avg_days_played   NUMERIC(5,2) NOT NULL DEFAULT 0,
  computed_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (week_id, current_rank)
);
