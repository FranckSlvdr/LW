import 'server-only'

/**
 * Server-side environment variable validation.
 *
 * Import this module at the top of any server entry point that needs env vars.
 * It throws at module load time if required variables are missing or invalid,
 * so misconfiguration fails fast rather than at runtime in a handler.
 *
 * Production-specific checks (e.g. minimum secret length) only apply when
 * NODE_ENV === 'production' to avoid blocking local dev with loose .env.local.
 */

// True only when running on an actual Vercel deployment (not local `next build`)
const isVercel = Boolean(process.env.VERCEL)

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[env] Required environment variable "${name}" is not set. ` +
      `Check .env.local (dev) or Vercel Environment Variables (production).`,
    )
  }
  return value
}

// ─── DATABASE_URL ─────────────────────────────────────────────────────────────

export const DATABASE_URL = required('DATABASE_URL')

// ─── APP_SECRET ───────────────────────────────────────────────────────────────

export const APP_SECRET = required('APP_SECRET')

const MIN_SECRET_LENGTH = 32

if (isVercel && APP_SECRET.length < MIN_SECRET_LENGTH) {
  throw new Error(
    `[env] APP_SECRET is too short (${APP_SECRET.length} chars). ` +
    `Production requires at least ${MIN_SECRET_LENGTH} characters. ` +
    `Generate one with: openssl rand -base64 32`,
  )
}

if (APP_SECRET.length < MIN_SECRET_LENGTH) {
  console.warn(
    `[env] WARNING: APP_SECRET is only ${APP_SECRET.length} chars. ` +
    `Use at least ${MIN_SECRET_LENGTH} chars in production.`,
  )
}

if (!isVercel && APP_SECRET === 'CHANGE_ME_use_openssl_rand_base64_32') {
  console.warn(
    '[env] WARNING: APP_SECRET is still the placeholder value from .env.example. ' +
    'Generate a real secret before deploying.',
  )
}

// ─── NEXT_PUBLIC_APP_URL ──────────────────────────────────────────────────────

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

if (isVercel && APP_URL === 'http://localhost:3000') {
  throw new Error(
    '[env] NEXT_PUBLIC_APP_URL must not be localhost in production.',
  )
}
