/**
 * Edge-compatible JWT implementation using Web Crypto API.
 *
 * Signs and verifies HS256 JWTs without any Node.js built-ins so this
 * module works in both Edge Runtime (middleware) and Node.js (route handlers).
 *
 * Payload structure:
 *   sub  — user UUID
 *   rol  — UserRole
 *   nam  — display name
 *   eml  — email
 *   ver  — token_version (for server-side invalidation)
 *   iat  — issued-at (seconds)
 *   exp  — expiry (seconds)
 */

export interface JwtPayload {
  sub: string       // user id
  rol: string       // UserRole
  nam: string       // name
  eml: string       // email
  ver: number       // token_version
  iat: number
  exp: number
}

const ALG = { name: 'HMAC', hash: 'SHA-256' }
const JWT_EXPIRY_SECONDS = 60 * 60 * 24       // 24 hours
const JWT_REFRESH_WINDOW = 60 * 60 * 4        // auto-refresh if < 4 hours left

// ─── Helpers ─────────────────────────────────────────────────────────────────

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + ((4 - (str.length % 4)) % 4),
    '=',
  )
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALG,
    false,
    ['sign', 'verify'],
  )
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export async function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + JWT_EXPIRY_SECONDS }

  const header  = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body    = b64url(new TextEncoder().encode(JSON.stringify(fullPayload)))
  const signing = `${header}.${body}`

  const key = await importKey(secret)
  const sig = await crypto.subtle.sign(ALG.name, key, new TextEncoder().encode(signing))

  return `${signing}.${b64url(sig)}`
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export type VerifyResult =
  | { ok: true; payload: JwtPayload; shouldRefresh: boolean }
  | { ok: false; reason: 'expired' | 'invalid' | 'malformed' }

export async function verifyJwt(token: string, secret: string): Promise<VerifyResult> {
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }

  const [header, body, sig] = parts
  const signing = `${header}.${body}`

  try {
    const key = await importKey(secret)
    const valid = await crypto.subtle.verify(
      ALG.name,
      key,
      b64urlDecode(sig),
      new TextEncoder().encode(signing),
    )
    if (!valid) return { ok: false, reason: 'invalid' }

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as JwtPayload
    const now = Math.floor(Date.now() / 1000)

    if (payload.exp < now) return { ok: false, reason: 'expired' }

    const timeLeft = payload.exp - now
    return { ok: true, payload, shouldRefresh: timeLeft < JWT_REFRESH_WINDOW }
  } catch {
    return { ok: false, reason: 'malformed' }
  }
}
