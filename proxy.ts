import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEFAULT_LOCALE, LOCALES, isValidLocale } from '@/lib/i18n/config'
import { signJwt, verifyJwt } from '@/lib/jwt'
import { parseAcceptLanguage } from '@/lib/i18n/utils'
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/server/security/sessionConfig'

const PUBLIC_EXACT = new Set(['/login'])
const PUBLIC_PREFIXES = ['/auth/', '/api/auth/', '/api/cron/']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function buildUnauthorizedResponse(
  request: NextRequest,
  pathname: string,
  search: string,
  clearCookie: boolean,
): NextResponse {
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      { status: 401 },
    )

    if (clearCookie) {
      response.cookies.delete(SESSION_COOKIE)
    }

    return response
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', `${pathname}${search}`)

  const response = NextResponse.redirect(loginUrl)
  if (clearCookie) {
    response.cookies.delete(SESSION_COOKIE)
  }
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

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

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const secret = process.env.APP_SECRET
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!secret || !token) {
    return buildUnauthorizedResponse(request, pathname, search, false)
  }

  const result = await verifyJwt(token, secret)
  if (!result.ok) {
    return buildUnauthorizedResponse(request, pathname, search, true)
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  if (result.shouldRefresh) {
    const refreshedToken = await signJwt(
      {
        sub: result.payload.sub,
        rol: result.payload.rol,
        nam: result.payload.nam,
        eml: result.payload.eml,
        ver: result.payload.ver,
      },
      secret,
    )

    response.cookies.set(SESSION_COOKIE, refreshedToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
