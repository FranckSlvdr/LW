/**
 * Database migration runner — Last War Tracker
 *
 * Usage:
 *   npm run db:migrate
 *
 * Behaviour:
 *   - Creates a `_migrations` tracking table on first run (idempotent)
 *   - Applies SQL files from server/db/migrations/ in lexicographic order
 *   - Skips files already recorded in `_migrations`
 *   - Wraps each migration in a transaction; rolls back on error
 *   - Safe to re-run at any time
 *
 * Env:
 *   DATABASE_URL   required  postgres://user:pass@host:port/db[?sslmode=require]
 */

import { config } from 'dotenv'
import { resolve, basename } from 'path'

// Load .env.local before any other import that needs DATABASE_URL
config({ path: resolve(process.cwd(), '.env.local') })

import { readdir, readFile } from 'fs/promises'
import postgres from 'postgres'

// ─── Connection ───────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env.local')
  process.exit(1)
}

function parseDbUrl(url: string) {
  const raw    = url.replace(/^postgres(?:ql)?:\/\//, '')
  const lastAt = raw.lastIndexOf('@')
  if (lastAt === -1) throw new Error('DATABASE_URL invalid: missing "@"')
  const credentials = raw.slice(0, lastAt)
  const hostPart    = raw.slice(lastAt + 1)
  const colonIdx    = credentials.indexOf(':')
  if (colonIdx === -1) throw new Error('DATABASE_URL invalid: missing ":" in credentials')
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

const opts = parseDbUrl(DATABASE_URL)
const sql  = postgres({ ...opts, max: 1 })

// ─── Tracking table ───────────────────────────────────────────────────────────

async function ensureTrackingTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        TEXT        PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

async function appliedMigrations(): Promise<Set<string>> {
  const rows = await sql<{ name: string }[]>`SELECT name FROM _migrations ORDER BY name`
  return new Set(rows.map((r) => r.name))
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const migrationsDir = resolve(process.cwd(), 'server/db/migrations')

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort()  // lexicographic = numeric order given 001_, 002_, ...

  if (files.length === 0) {
    console.log('No migration files found.')
    await sql.end()
    return
  }

  await ensureTrackingTable()
  const applied = await appliedMigrations()

  const pending = files.filter((f) => !applied.has(f))

  if (pending.length === 0) {
    console.log(`All ${files.length} migrations already applied.`)
    await sql.end()
    return
  }

  console.log(`${applied.size} already applied, ${pending.length} pending.\n`)

  for (const file of pending) {
    const filePath = resolve(migrationsDir, file)
    const sqlText  = await readFile(filePath, 'utf-8')

    process.stdout.write(`  Applying ${file} ... `)

    try {
      await sql.begin(async (tx) => {
        // Execute the migration SQL
        await tx.unsafe(sqlText)
        // Record it as applied within the same transaction
        await tx`INSERT INTO _migrations (name) VALUES (${file})`
      })
      console.log('done')
    } catch (err) {
      console.log('FAILED')
      console.error(`\nError in ${file}:`)
      console.error(err instanceof Error ? err.message : String(err))
      console.error('\nMigration rolled back. Fix the error and re-run.')
      await sql.end()
      process.exit(1)
    }
  }

  console.log(`\n${pending.length} migration(s) applied successfully.`)
  await sql.end()
}

run().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
