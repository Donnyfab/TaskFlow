import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/landing']
const PROTECTED_PATHS = ['/home', '/tasks', '/habits', '/journal', '/calendar', '/ai', '/focus', '/score', '/settings', '/account']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('taskflow_session')

  // Redirect root
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return NextResponse.redirect(new URL('/landing', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    if (session) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return NextResponse.next()
  }

  // Protect app pages
  if (PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/home/:path*', '/tasks/:path*', '/habits/:path*', '/journal/:path*', '/calendar/:path*', '/ai/:path*', '/focus/:path*', '/score/:path*', '/settings/:path*', '/account/:path*', '/auth/:path*'],
}