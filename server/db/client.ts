import 'server-only'
import postgres from 'postgres'

/**
 * PostgreSQL client — lazy singleton.
 *
 * Utilise parseDbUrl() pour extraire les paramètres de connexion sans passer
 * la chaîne brute à `new URL()`. Cela évite les erreurs "Invalid URL" quand
 * le mot de passe contient des caractères spéciaux non encodés (/, @, [, {…).
 */

declare global {
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
    // Serverless: 2 connections per instance on Vercel (Supavisor transaction mode handles
    // the real pool server-side, so client connections are cheap).
    // 1 connection for main requests + 1 for after() background recomputes — prevents
    // background analytics refreshes from blocking page-level DB queries.
    max: process.env.VERCEL ? 2 : 10,
    // On Vercel, keep idle connections alive for the function lifetime (~15min max).
    // Short idle_timeout (20s) was causing reconnects mid-request on warm instances.
    idle_timeout: process.env.VERCEL ? 60 : 300,
    // Tight connect timeout to fail fast and surface DB issues early.
    connect_timeout: process.env.VERCEL ? 8 : 10,
    // Transaction pooler (Supabase Supavisor port 6543) does not support prepared statements.
    prepare: !process.env.VERCEL,
    // Supabase free tier applies a session-level statement_timeout that fires
    // from when the pooler receives the connection — not when PostgreSQL starts
    // executing. Vercel cold starts eat into this budget, causing spurious
    // "canceling statement due to statement timeout" errors. Disable it here
    // so only the Supabase admin-level timeout (which fires later) applies.
    connection: process.env.VERCEL ? { statement_timeout: 0 } : {},
  })
}

function getClient(): ReturnType<typeof postgres> {
  return (globalThis._pgClient ??= createClient())
}

// ─── AggregateError unwrapper ────────────────────────────────────────────────
//
// postgres.js throws AggregateError on connection failures. The `.message` is
// empty — actual errors live in `.errors[]`. Next.js Server Components then
// surfaces "no message was provided", making the root cause invisible.
// Re-throw as a plain Error so the real message reaches the error overlay.

function unwrapAggregateError(err: unknown): never {
  if (err instanceof AggregateError) {
    const first = err.errors?.[0]
    const msg = first instanceof Error
      ? first.message
      : first != null ? String(first) : 'unknown database error'
    const wrapped = new Error(`DB: ${msg}`)
    wrapped.cause = err
    throw wrapped
  }
  throw err
}

function wrapPromise(p: unknown): unknown {
  if (p instanceof Promise) return p.catch(unwrapAggregateError)
  return p
}

// ─── Export lazy proxy ────────────────────────────────────────────────────────

export const db = new Proxy(
  function () {} as unknown as ReturnType<typeof postgres>,
  {
    apply(_target, thisArg, args) {
      const client = getClient()
      return wrapPromise(
        (client as unknown as (...a: unknown[]) => unknown).apply(thisArg, args),
      )
    },
    get(_target, prop) {
      const client = getClient()
      const value = (client as unknown as Record<string | symbol, unknown>)[prop]
      if (typeof value !== 'function') return value
      return function (this: unknown, ...args: unknown[]) {
        return wrapPromise((value as (...a: unknown[]) => unknown).apply(client, args))
      }
    },
  },
)
