import 'server-only'
import { db } from '@/server/db/client'
import type { StatsCacheRow } from '@/types/db'

/**
 * Returns the cached payload for the given key, or null on miss.
 * The payload type is enforced at the service layer.
 */
export async function findStatsCache(key: string): Promise<unknown | null> {
  const rows = await db<StatsCacheRow[]>`
    SELECT payload, computed_at FROM stats_cache WHERE key = ${key} LIMIT 1
  `
  return rows[0]?.payload ?? null
}

/**
 * Upserts a stats cache entry.
 * Idempotent — safe to call multiple times with the same key.
 */
export async function saveStatsCache(key: string, payload: unknown): Promise<void> {
  const data = JSON.parse(JSON.stringify(payload)) as Parameters<typeof db.json>[0]
  await db`
    INSERT INTO stats_cache (key, payload, computed_at)
    VALUES (${key}, ${db.json(data)}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      payload     = EXCLUDED.payload,
      computed_at = NOW()
  `
}
