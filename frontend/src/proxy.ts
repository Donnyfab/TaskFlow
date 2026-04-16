import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Must match SESSION_COOKIE_NAME in Flask config (default: taskflow_session)
const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || 'taskflow_session'

const PROTECTED = ['/home', '/tasks', '/habits', '/journal', '/calendar', '/focus', '/ai', '/settings']
const AUTH_ROUTES = ['/auth/login', '/auth/register']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  // Root: smart redirect based on session presence
  if (pathname === '/') {
    const dest = hasSession ? '/home' : '/auth/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Protected app routes: no cookie → send to login
  if (PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!hasSession) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Auth pages: already has a session → skip login screen
  if (AUTH_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/home/:path*',
    '/tasks/:path*',
    '/habits/:path*',
    '/journal/:path*',
    '/calendar/:path*',
    '/focus/:path*',
    '/ai/:path*',
    '/settings/:path*',
    '/auth/login',
    '/auth/login/:path*',
    '/auth/register',
    '/auth/register/:path*',
  ],
}
