import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCALES, DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n/config'
import { parseAcceptLanguage } from '@/lib/i18n/utils'
import { verifyJwt } from '@/lib/jwt'

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_COOKIE = '_session'

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/auth/',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/accept-invite',
]

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Locale detection — always run regardless of auth state
  const cookieValue = request.cookies.get('NEXT_LOCALE')?.value
  const locale = isValidLocale(cookieValue)
    ? cookieValue
    : parseAcceptLanguage(
        request.headers.get('accept-language'),
        LOCALES,
        DEFAULT_LOCALE,
      )

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', locale)

  // 2. Auth check — skip public paths and static assets
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (!isPublic) {
    const secret = process.env.APP_SECRET
    const token  = request.cookies.get(SESSION_COOKIE)?.value

    // Fast path: verify JWT signature + expiry only (no DB — stays Edge-safe)
    let authenticated = false
    if (secret && token) {
      try {
        const result = await verifyJwt(token, secret)
        authenticated = result.ok
      } catch {
        // crypto failure = not authenticated
      }
    }

    if (!authenticated) {
      // API routes: return 401 JSON
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 },
        )
      }

      // Page routes: redirect to /login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 3. Pass through with locale header
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
