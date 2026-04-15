/**
 * reset-db.mjs — vide les données joueurs/semaines et insère la semaine de départ.
 * Les comptes utilisateurs (users, user_credentials) sont PRÉSERVÉS.
 * Usage : node scripts/reset-db.mjs
 */
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Lire DATABASE_URL depuis .env.local
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
const match = envContent.match(/^DATABASE_URL=(.+)$/m)
if (!match) { console.error('DATABASE_URL introuvable dans .env.local'); process.exit(1) }
const DATABASE_URL = match[1].trim()

const db = postgres(DATABASE_URL, { max: 1 })

try {
  console.log('🗑  Vidage des données joueurs/semaines (users préservés)...')
  await db`
    TRUNCATE TABLE
      import_rows,
      imports,
      train_selections,
      train_runs,
      player_professions,
      daily_scores,
      contributions,
      desert_storm_scores,
      event_participation,
      vs_days,
      week_kpi_snapshots,
      week_member_stats,
      week_rank_stats,
      player_ratings,
      rating_runs,
      audit_logs,
      players,
      weeks
    RESTART IDENTITY CASCADE
  `
  console.log('✓ Tables joueurs/semaines vidées')

  console.log('📅 Création de la semaine 6–12 avril 2026...')
  const [week] = await db`
    INSERT INTO weeks (start_date, end_date, label)
    VALUES ('2026-04-06', '2026-04-12', 'Semaine 15 · 2026')
    RETURNING *
  `
  console.log(`✓ Semaine créée : id=${week.id} — ${week.label} (${week.start_date} → ${week.end_date})`)

  console.log('\n✅ Base prête. Tu peux importer les joueurs.')
} catch (err) {
  console.error('❌ Erreur :', err.message)
  process.exit(1)
} finally {
  await db.end()
}
