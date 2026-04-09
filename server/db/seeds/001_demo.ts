/**
 * Seed script — données de démonstration Last War Tracker.
 *
 * Usage:
 *   npm run db:seed
 *
 * Idempotent : peut être exécuté plusieurs fois sans erreur (ON CONFLICT DO NOTHING).
 * Données : 20 joueurs, 2 semaines, scores réalistes avec éco days et absences.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local before any other import that needs DATABASE_URL
config({ path: resolve(process.cwd(), '.env.local') })

import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL manquant dans .env.local')
  process.exit(1)
}

// Parse DATABASE_URL without new URL() to support special chars in passwords
function parseDbUrl(url: string) {
  const raw = url.replace(/^postgres(?:ql)?:\/\//, '')
  const lastAt = raw.lastIndexOf('@')
  if (lastAt === -1) throw new Error('DATABASE_URL invalide : "@" manquant')
  const credentials = raw.slice(0, lastAt)
  const hostPart    = raw.slice(lastAt + 1)
  const colonIdx    = credentials.indexOf(':')
  if (colonIdx === -1) throw new Error('DATABASE_URL invalide : pas de ":" dans les credentials')
  const username = credentials.slice(0, colonIdx)
  const password = credentials.slice(colonIdx + 1)
  const [hostPort, dbAndParams = ''] = hostPart.split('/')
  const [dbName, queryString]        = dbAndParams.split('?')
  const [host, portStr]              = (hostPort ?? '').split(':')
  const sslmode = queryString
    ?.split('&')
    .find((p) => p.startsWith('sslmode='))
    ?.split('=')[1]
  return {
    username,
    password,
    host:     host   ?? 'localhost',
    port:     Number(portStr ?? 5432),
    database: dbName ?? 'postgres',
    ssl: sslmode === 'require' ? ('require' as const) : undefined,
  }
}

const { username, password, host, port, database, ssl } = parseDbUrl(DATABASE_URL)
const sql = postgres({ username, password, host, port, database, ssl, max: 1 })

// ─── Data ────────────────────────────────────────────────────────────────────

const PLAYERS = [
  { name: 'DragonSlayer', alias: 'DS' },
  { name: 'IronWolf',     alias: 'IW' },
  { name: 'PhoenixRise',  alias: null },
  { name: 'ShadowBlade',  alias: 'SB' },
  { name: 'StormBreaker', alias: null },
  { name: 'NightHawk',    alias: 'NH' },
  { name: 'CrimsonFang',  alias: null },
  { name: 'TitanForge',   alias: 'TF' },
  { name: 'VoidWalker',   alias: null },
  { name: 'EmberKnight',  alias: 'EK' },
  { name: 'FrostGiant',   alias: null },
  { name: 'ArcLight',     alias: 'AL' },
  { name: 'BoneCrusher',  alias: null },
  { name: 'CobraStrike',  alias: 'CS' },
  { name: 'RuneCarver',   alias: null },
  { name: 'GlacierAxe',   alias: 'GA' },
  { name: 'SilentArrow',  alias: null },
  { name: 'ThunderClaw',  alias: 'TC' },
  { name: 'MoonShard',    alias: null },
  { name: 'WildEdge',     alias: 'WE' },
]

/** Score ranges per player (in millions): [min, max] */
const SCORE_RANGE: Record<number, [number, number]> = {
  1:  [40, 55], 2:  [35, 50], 3:  [32, 48], 4:  [28, 44], 5:  [25, 40],
  6:  [22, 38], 7:  [20, 35], 8:  [18, 32], 9:  [15, 28], 10: [14, 26],
  11: [12, 24], 12: [10, 22], 13: [8,  20], 14: [7,  18], 15: [6,  16],
  16: [5,  14], 17: [4,  12], 18: [3,  10], 19: [2,   8], 20: [1,   6],
}

/** Player indices (1-based) who are absent in each week */
const ABSENCES: Record<number, number[]> = {
  1: [],     // Week 1 (previous): nobody absent
  2: [20],   // Week 2 (current): WildEdge absent
}

/** Players with reduced participation (only 3 days) */
const LOW_PARTICIPATION: Record<number, { playerIdx: number; days: number[] }[]> = {
  1: [{ playerIdx: 19, days: [1, 3, 5] }],
  2: [{ playerIdx: 19, days: [2, 4, 6] }],
}

/** Days explicitly marked as eco (score forced to 2-4M) */
const ECO_DAYS: Record<number, Array<{ playerIdx: number; day: number }>> = {
  1: [
    { playerIdx: 15, day: 3 }, { playerIdx: 16, day: 4 },
    { playerIdx: 17, day: 4 }, { playerIdx: 18, day: 5 },
  ],
  2: [
    { playerIdx: 14, day: 3 }, { playerIdx: 15, day: 4 },
    { playerIdx: 16, day: 4 }, { playerIdx: 17, day: 3 },
    { playerIdx: 18, day: 4 },
  ],
}

function makeScore(playerIdx: number, weekId: number, day: number): number {
  const ecoSet = new Set(
    (ECO_DAYS[weekId] ?? [])
      .filter((e) => e.playerIdx === playerIdx && e.day === day)
      .map(() => true)
  )
  if (ecoSet.size > 0) {
    // Eco day: 2–4M (below 5M threshold)
    return Math.floor(2_000_000 + Math.random() * 2_000_000)
  }

  const [min, max] = SCORE_RANGE[playerIdx] ?? [1, 5]
  return Math.floor((min + Math.random() * (max - min)) * 1_000_000)
}

function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Démarrage du seed...\n')

  // ── 1. Players ─────────────────────────────────────────────────────────────
  console.log('👥  Insertion des joueurs...')
  for (const p of PLAYERS) {
    await sql`
      INSERT INTO players (name, normalized_name, alias)
      VALUES (${p.name}, ${normalize(p.name)}, ${p.alias})
      ON CONFLICT (normalized_name) DO NOTHING
    `
  }
  const playerRows = await sql<{ id: number; name: string }[]>`
    SELECT id, name FROM players ORDER BY id
  `
  const playerByName = new Map(playerRows.map((r) => [r.name, r.id]))
  console.log(`   ✓ ${playerRows.length} joueurs en base\n`)

  // ── 2. Weeks ───────────────────────────────────────────────────────────────
  console.log('📅  Insertion des semaines...')
  const weeks = [
    { start: '2025-03-31', end: '2025-04-05', label: 'Semaine 14 · 2025' },
    { start: '2025-04-07', end: '2025-04-12', label: 'Semaine 15 · 2025' },
  ]
  const weekIds: number[] = []
  for (const w of weeks) {
    const rows = await sql<{ id: number }[]>`
      INSERT INTO weeks (start_date, end_date, label)
      VALUES (${w.start}, ${w.end}, ${w.label})
      ON CONFLICT (start_date) DO UPDATE SET label = EXCLUDED.label
      RETURNING id
    `
    weekIds.push(rows[0]!.id)
  }
  // Lock week 1 (previous week)
  await sql`UPDATE weeks SET is_locked = TRUE WHERE start_date = '2025-03-31'`
  console.log(`   ✓ Semaines créées : ${weeks.map((w) => w.label).join(', ')}\n`)

  // ── 3. Scores ──────────────────────────────────────────────────────────────
  console.log('📊  Insertion des scores...')
  let totalScores = 0

  for (let weekIdx = 0; weekIdx < weeks.length; weekIdx++) {
    const weekId = weekIds[weekIdx]!
    const weekNum = weekIdx + 1
    const absences = new Set(ABSENCES[weekNum] ?? [])
    const lowPart = new Map(
      (LOW_PARTICIPATION[weekNum] ?? []).map((e) => [e.playerIdx, e.days])
    )

    for (let pIdx = 1; pIdx <= PLAYERS.length; pIdx++) {
      if (absences.has(pIdx)) continue

      const playerName = PLAYERS[pIdx - 1]!.name
      const playerId = playerByName.get(playerName)
      if (!playerId) continue

      const days = lowPart.get(pIdx) ?? [1, 2, 3, 4, 5, 6]

      for (const day of days) {
        const score = makeScore(pIdx, weekNum, day)
        const isEco = score < 5_000_000

        await sql`
          INSERT INTO daily_scores (player_id, week_id, day_of_week, score, is_eco, source)
          VALUES (${playerId}, ${weekId}, ${day}, ${score}, ${isEco}, 'csv')
          ON CONFLICT (player_id, week_id, day_of_week)
          DO UPDATE SET score = EXCLUDED.score, is_eco = EXCLUDED.is_eco, updated_at = NOW()
        `
        totalScores++
      }
    }
  }
  console.log(`   ✓ ${totalScores} scores insérés\n`)

  // ── 4. Imports (historique de démonstration) ───────────────────────────────
  console.log('📥  Insertion de l\'historique des imports...')
  await sql`
    INSERT INTO imports (import_type, week_id, filename, status, rows_total, rows_imported, rows_skipped, imported_by)
    VALUES
      ('players', NULL, 'roster_april_2025.csv', 'partial', 21, 20, 1, 'admin'),
      ('scores',  ${weekIds[0]}, 'scores_s14.csv', 'success', 114, 114, 0, 'admin'),
      ('scores',  ${weekIds[1]}, 'scores_s15.csv', 'success', 108, 108, 0, 'admin')
    ON CONFLICT DO NOTHING
  `
  console.log('   ✓ 3 imports créés\n')

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('✅  Seed terminé avec succès !\n')
  console.log('   Données disponibles :')
  console.log(`   - ${playerRows.length} joueurs actifs`)
  console.log(`   - 2 semaines (S14 verrouillée, S15 active)`)
  console.log(`   - ${totalScores} scores journaliers`)
  console.log('   - 3 entrées dans l\'historique des imports')
  console.log('\n   👉  Ouvrez http://localhost:3000/dashboard')

  await sql.end()
}

seed().catch((err) => {
  console.error('❌  Seed échoué :', err.message)
  sql.end()
  process.exit(1)
})
