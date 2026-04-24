import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Must match SESSION_COOKIE_NAME in Flask config (default: taskflow_session)
const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || 'taskflow_session'
const FLASK_URL = (process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:8001').replace(/\/$/, '')

const PROTECTED = ['/home', '/tasks', '/habits', '/journal', '/calendar', '/focus', '/ai', '/settings']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  // Root: smart redirect based on session presence
  if (pathname === '/') {
    const dest = hasSession ? new URL('/home', request.url) : new URL(`${FLASK_URL}/login`)
    return NextResponse.redirect(dest)
  }

  // Protected app routes: no cookie → send to Flask login
  if (PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (!hasSession) {
      const loginUrl = new URL(`${FLASK_URL}/login`)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
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
  ],
}
