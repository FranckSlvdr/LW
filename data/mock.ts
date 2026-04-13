/**
 * Realistic mock data for dashboard development and demos.
 * Used when no real database data is available.
 *
 * Scores are in the millions range, matching typical Last War VS values.
 * Eco days are represented by scores below 5M.
 * Absences are represented by missing entries (score 0 in the KPI engine).
 */

import type { PlayerKpi, WeekKpiSummary, WeekApi, Insight } from '@/types/api'
import type { DashboardData } from '@/server/services/kpiService'
import type { Import } from '@/types/domain'
import { computeKpis, getTopPlayers, getFlopPlayers } from '@/server/engines/kpiEngine'
import { generateInsights } from '@/server/engines/insightEngine'
import { fr } from '@/lib/i18n/locales/fr'
import { APP_CONFIG } from '@/config/app.config'
import type { Player, DailyScore } from '@/types/domain'

// ─── Players ──────────────────────────────────────────────────────────────────

const MOCK_PLAYERS: Player[] = [
  { id: 1,  name: 'DragonSlayer',  normalizedName: 'dragonslayer',  alias: 'DS',   currentRank: 'R5', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 2,  name: 'IronWolf',      normalizedName: 'ironwolf',      alias: 'IW',   currentRank: 'R4', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 3,  name: 'PhoenixRise',   normalizedName: 'phoenixrise',   alias: null,   currentRank: 'R4', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 4,  name: 'ShadowBlade',   normalizedName: 'shadowblade',   alias: 'SB',   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 5,  name: 'StormBreaker',  normalizedName: 'stormbreaker',  alias: null,   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 6,  name: 'NightHawk',     normalizedName: 'nighthawk',     alias: 'NH',   currentRank: 'R3', suggestedRank: 'R4', rankReason: 'Participation élevée 4 semaines consécutives', isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 7,  name: 'CrimsonFang',   normalizedName: 'crimsonfang',   alias: null,   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 8,  name: 'TitanForge',    normalizedName: 'titanforge',    alias: 'TF',   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 9,  name: 'VoidWalker',    normalizedName: 'voidwalker',    alias: null,   currentRank: 'R2', suggestedRank: 'R1', rankReason: 'Absence 3 semaines consécutives', isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 10, name: 'EmberKnight',   normalizedName: 'emberknight',   alias: 'EK',   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 11, name: 'FrostGiant',    normalizedName: 'frostgiant',    alias: null,   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 12, name: 'ArcLight',      normalizedName: 'arclight',      alias: 'AL',   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 13, name: 'BoneCrusher',   normalizedName: 'bonecrusher',   alias: null,   currentRank: null,  suggestedRank: 'R3', rankReason: 'Nouveau membre actif', isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 14, name: 'CobraStrike',   normalizedName: 'cobrastrike',   alias: 'CS',   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 15, name: 'RuneCarver',    normalizedName: 'runecarver',    alias: null,   currentRank: 'R2', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 16, name: 'GlacierAxe',    normalizedName: 'glacieraxe',    alias: 'GA',   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 17, name: 'SilentArrow',   normalizedName: 'silentarrow',   alias: null,   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 18, name: 'ThunderClaw',   normalizedName: 'thunderclaw',   alias: 'TC',   currentRank: 'R1', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 19, name: 'MoonShard',     normalizedName: 'moonshard',     alias: null,   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 20, name: 'WildEdge',      normalizedName: 'wildedge',      alias: 'WE',   currentRank: 'R3', suggestedRank: null, rankReason: null, isActive: true, joinedAt: null, leftAt: null, generalLevel: null, professionKey: null, professionLevel: null, createdAt: new Date(), updatedAt: new Date() },
]

// ─── Score factory ─────────────────────────────────────────────────────────────

/** Score ranges per player tier (in millions) */
const TIER: Record<number, [number, number]> = {
  1:  [40, 55], 2:  [35, 50], 3:  [32, 48], 4:  [28, 44], 5:  [25, 40],
  6:  [22, 38], 7:  [20, 35], 8:  [18, 32], 9:  [15, 28], 10: [14, 26],
  11: [12, 24], 12: [10, 22], 13: [8,  20], 14: [7,  18], 15: [6,  16],
  16: [5,  14], 17: [4,  12], 18: [3,  10], 19: [2,   8], 20: [1,   6],
}

function makeScore(playerId: number, weekId: number, day: number, offset: number = 0): DailyScore {
  const [min, max] = TIER[playerId] ?? [1, 5]
  const base = (min + Math.random() * (max - min)) * 1_000_000 + offset
  // Eco day: players 15-20 occasionally score very low
  const isEcoCandidate = playerId >= 15 && day === 4
  const score = isEcoCandidate ? Math.floor(Math.random() * 3_000_000) : Math.floor(base)
  const isEco = score < 5_000_000 && score > 0

  return {
    id: weekId * 1000 + playerId * 10 + day,
    playerId,
    weekId,
    dayOfWeek: day as 1|2|3|4|5|6,
    score,
    isEco,
    source: 'manual',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function makeWeekScores(weekId: number, absences: number[] = []): DailyScore[] {
  const scores: DailyScore[] = []
  for (const player of MOCK_PLAYERS) {
    if (absences.includes(player.id)) continue
    const days = player.id === 19 ? [1, 3, 5] : [1, 2, 3, 4, 5, 6] // player 19 plays 3 days
    for (const day of days) {
      scores.push(makeScore(player.id, weekId, day))
    }
  }
  return scores
}

// Seed random — stable values for demo
const CURRENT_SCORES  = makeWeekScores(2, [20]) // player 20 absent
const PREVIOUS_SCORES = makeWeekScores(1, [])

// ─── Weeks ────────────────────────────────────────────────────────────────────

export const MOCK_WEEKS: WeekApi[] = [
  { id: 2, startDate: '2025-04-07', endDate: '2025-04-12', label: 'Semaine 15 · 2025', isLocked: false },
  { id: 1, startDate: '2025-03-31', endDate: '2025-04-05', label: 'Semaine 14 · 2025', isLocked: true  },
]

// ─── Dashboard data assembly ───────────────────────────────────────────────────

function buildDashboard(weekId: number): DashboardData {
  const isCurrent = weekId === 2
  const currentScores = isCurrent ? CURRENT_SCORES : PREVIOUS_SCORES
  const previousScores = isCurrent ? PREVIOUS_SCORES : undefined

  const allKpis = computeKpis({
    players: MOCK_PLAYERS,
    currentScores,
    previousScores,
  })

  const globalTotalScore = allKpis.reduce((s, k) => s + k.totalScore, 0)
  const activePlayers = allKpis.filter((k) => k.daysPlayed > 0)
  const globalAverageScore =
    activePlayers.length > 0
      ? Math.round(globalTotalScore / activePlayers.length)
      : 0

  let vsLastWeek = null
  if (previousScores) {
    const prevKpis = computeKpis({ players: MOCK_PLAYERS, currentScores: previousScores })
    const prevTotal = prevKpis.reduce((s, k) => s + k.totalScore, 0)
    const prevActive = prevKpis.filter((k) => k.daysPlayed > 0).length
    vsLastWeek = {
      weekId: 1,
      weekLabel: 'Semaine 14 · 2025',
      globalTotalScoreDelta: globalTotalScore - prevTotal,
      participationDelta: activePlayers.length - prevActive,
    }
  }

  const prevKpisForInsights = previousScores
    ? computeKpis({ players: MOCK_PLAYERS, currentScores: previousScores })
    : undefined

  return {
    summary: {
      weekId,
      weekLabel: isCurrent ? 'Semaine 15 · 2025' : 'Semaine 14 · 2025',
      totalPlayers: activePlayers.length,
      globalTotalScore,
      globalRawTotalScore: allKpis.reduce((s, k) => s + k.rawTotalScore, 0),
      globalAverageScore,
      topPlayers: getTopPlayers(allKpis, APP_CONFIG.dashboardTopFlopCount),
      flopPlayers: getFlopPlayers(allKpis, APP_CONFIG.dashboardTopFlopCount),
      vsLastWeek,
    },
    allKpis,
    insights: generateInsights(
      {
        currentKpis: allKpis,
        previousKpis: prevKpisForInsights,
        weekLabel: isCurrent ? 'Semaine 15 · 2025' : 'Semaine 14 · 2025',
      },
      fr.insights,
    ),
  }
}

export const MOCK_DASHBOARD_CURRENT  = buildDashboard(2)
export const MOCK_DASHBOARD_PREVIOUS = buildDashboard(1)

export function getMockDashboard(weekId: number): DashboardData {
  return weekId === 1 ? MOCK_DASHBOARD_PREVIOUS : MOCK_DASHBOARD_CURRENT
}

// ─── Mock imports ─────────────────────────────────────────────────────────────

export const MOCK_IMPORTS: Import[] = [
  {
    id: 2,
    importType: 'scores',
    weekId: 2,
    filename: 'scores_s15.csv',
    status: 'success',
    rowsTotal: 114,
    rowsImported: 114,
    rowsSkipped: 0,
    errorsJson: null,
    importedBy: null,
    createdAt: new Date('2025-04-07T08:12:00Z'),
  },
  {
    id: 1,
    importType: 'players',
    weekId: null,
    filename: 'roster_april.csv',
    status: 'partial',
    rowsTotal: 21,
    rowsImported: 20,
    rowsSkipped: 1,
    errorsJson: [{ row: 8, field: 'name', message: 'Nom en doublon' }],
    importedBy: null,
    createdAt: new Date('2025-04-01T14:30:00Z'),
  },
]
