import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_ROLE, AUTH_COOKIE_TOKEN } from '@/lib/auth'

const PUBLIC_PREFIXES = ['/', '/auth/login', '/teachery.svg']

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(AUTH_COOKIE_TOKEN)?.value
  const role = request.cookies.get(AUTH_COOKIE_ROLE)?.value

  if (isPublicPath(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL(role === 'admin' ? '/admin/dashboard' : '/assessments', request.url))
    }
    return NextResponse.next()
  }

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/assessments', request.url))
  }

  if (!pathname.startsWith('/admin') && role === 'admin' && pathname !== '/') {
    const guruOnlyPrefixes = ['/assessments', '/jobs', '/credits', '/tools']
    if (guruOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.svg|teachery\\.svg|manifest\\.json|manifest\\.webmanifest|images).*)',
  ],
}
