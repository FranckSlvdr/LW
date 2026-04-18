/**
 * Edge Middleware — authentication gate.
 *
 * Runs at the Vercel Edge before any serverless function is invoked.
 * Verifies the session JWT using Web Crypto API (no Node.js required).
 *
 * Flow:
 *  1. Public paths → pass through immediately (no auth check)
 *  2. No session cookie → redirect to /login at Edge (~0ms vs ~200ms cold start)
 *  3. Invalid / expired JWT → redirect to /login, clear stale cookie
 *  4. Valid JWT → let through (serverless function does the full tokenVersion DB check)
 *
 * Note: the tokenVersion revocation check still happens inside server components
 * via getSessionUser(). The middleware only handles the fast-path rejection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { SESSION_COOKIE } from '@/server/security/sessionConfig'

// ─── Public path rules ────────────────────────────────────────────────────────

/** Exact paths that bypass authentication entirely. */
const PUBLIC_EXACT = new Set(['/login'])

/** Path prefixes that bypass authentication. */
const PUBLIC_PREFIXES = [
  '/api/auth/',   // login, logout, password reset
  '/auth/',       // accept-invite, forgot-password, reset-password UI
  '/api/cron/',   // cron jobs (protected by CRON_SECRET, not session)
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value

  // No cookie → redirect to login immediately at Edge
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const secret = process.env.APP_SECRET
  if (!secret) {
    // APP_SECRET missing — fail open so the serverless function can surface the error
    console.error('middleware: APP_SECRET is not configured')
    return NextResponse.next()
  }

  const result = await verifyJwt(token, secret)

  if (!result.ok) {
    // Expired or tampered token — redirect and clear the stale cookie
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  return NextResponse.next()
}

// ─── Matcher ─────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - common image/font extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
