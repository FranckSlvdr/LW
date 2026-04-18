import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/server/security/sessionConfig'

function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function buildSessionCookieHeader(token: string): string {
  const secure = shouldUseSecureCookies() ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`
}

export function buildClearedSessionCookie(): string {
  const secure = shouldUseSecureCookies() ? '; Secure' : ''
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}
