import 'server-only'
import postgres from 'postgres'
import '@/lib/env' // validates required env vars at module load

/**
 * PostgreSQL client — lazy singleton.
 *
 * Utilise parseDbUrl() pour extraire les paramètres de connexion sans passer
 * la chaîne brute à `new URL()`. Cela évite les erreurs "Invalid URL" quand
 * le mot de passe contient des caractères spéciaux non encodés (/, @, [, {…).
 */

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined
}

// ─── URL parser robuste ───────────────────────────────────────────────────────

interface DbOptions {
  username: string
  password: string
  host: string
  port: number
  database: string
  ssl?: boolean | 'require'
}

/**
 * Parse une DATABASE_URL sans passer par `new URL()`.
 * Supporte les mots de passe avec caractères spéciaux non encodés.
 *
 * Format : postgres://user:password@host:port/database[?sslmode=require]
 *
 * Stratégie : chercher le dernier `@` pour séparer credentials / host,
 * ce qui permet d'avoir un `@` dans le mot de passe s'il est encodé (%40).
 */
function parseDbUrl(url: string): DbOptions {
  // Retirer le protocole
  const raw = url.replace(/^postgres(?:ql)?:\/\//, '')

  // Dernier @ = séparateur credentials/host
  const lastAt = raw.lastIndexOf('@')
  if (lastAt === -1) throw new Error('DATABASE_URL invalide : "@" manquant')

  const credentials = raw.slice(0, lastAt)
  const hostPart    = raw.slice(lastAt + 1)

  // Premier ":" dans credentials = séparateur user/password
  const colonIdx = credentials.indexOf(':')
  if (colonIdx === -1) throw new Error('DATABASE_URL invalide : pas de ":" dans les credentials')

  const username = credentials.slice(0, colonIdx)
  const password = credentials.slice(colonIdx + 1)

  // host:port/database[?params]
  const [hostPort, dbAndParams = ''] = hostPart.split('/')
  const [dbName, queryString]        = dbAndParams.split('?')
  const [host, portStr]              = (hostPort ?? '').split(':')

  const sslmode = queryString
    ?.split('&')
    .find((p) => p.startsWith('sslmode='))
    ?.split('=')[1]

  return {
    username,
    password,          // mot de passe brut, sans encodage
    host:     host     ?? 'localhost',
    port:     Number(portStr ?? 5432),
    database: dbName   ?? 'postgres',
    ssl: sslmode === 'require' ? 'require' : undefined,
  }
}

// ─── Client factory ───────────────────────────────────────────────────────────

function createClient(): ReturnType<typeof postgres> {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Add it to .env.local for development.',
    )
  }

  const { username, password, host, port, database, ssl } = parseDbUrl(connectionString)

  return postgres({
    username,
    password,
    host,
    port,
    database,
    ssl,
    // Serverless-safe pool size: each function instance holds at most 3 connections.
    // On Vercel, multiple instances can run concurrently — keep this low to avoid
    // exhausting the DB connection limit (Supabase free tier: 100 max).
    max: process.env.VERCEL ? 3 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
}

function getClient(): ReturnType<typeof postgres> {
  return (globalThis._pgClient ??= createClient())
}

// ─── Export lazy proxy ────────────────────────────────────────────────────────

export const db = new Proxy(
  function () {} as unknown as ReturnType<typeof postgres>,
  {
    apply(_target, thisArg, args) {
      const client = getClient()
      return (client as unknown as (...a: unknown[]) => unknown).apply(thisArg, args)
    },
    get(_target, prop) {
      const client = getClient()
      const value = (client as unknown as Record<string | symbol, unknown>)[prop]
      return typeof value === 'function' ? value.bind(client) : value
    },
  },
)
