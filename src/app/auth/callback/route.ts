import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  if (oauthError) {
    console.error('[auth/callback] OAuth error from Supabase:')
    console.error('  error:', oauthError)
    console.error('  description:', oauthErrorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}&reason=${encodeURIComponent(oauthErrorDescription ?? '')}`
    )
  }

  if (!code) {
    console.error('[auth/callback] No code and no error — unexpected state')
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get('cookie')
            ?.split('; ')
            .map((c) => {
              const [name, ...rest] = c.split('=')
              return { name: name.trim(), value: rest.join('=') }
            }) ?? []
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`
    )
  }

  console.log('[auth/callback] Session exchanged for:', data.user?.email)
  return response
}
