import { NextResponse, type NextRequest } from 'next/server'

export function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — always allow
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // Check for a Supabase session cookie without creating a Supabase client.
  // Supabase SSR stores the session as sb-<project-ref>-auth-token.
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
