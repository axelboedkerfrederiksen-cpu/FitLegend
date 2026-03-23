'use client'

import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

const FEATURES = ['Log every lift', 'Auto-detect PRs', 'Progress charts', 'Social feed']

async function handleGoogleSignIn() {
  const supabase = createClient()
  const callbackUrl = new URL('/auth/callback', window.location.origin)
  callbackUrl.searchParams.set('next', '/feed')
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: false,
      scopes: 'openid email profile',
      queryParams: {
        prompt: 'select_account',
      },
    },
  })
}export default function LoginPage() {
  async function handleGoogleSignIn() {
    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', '/feed')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        skipBrowserRedirect: false,
        scopes: 'openid email profile',
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
  }async function handleGoogleSignIn() {
  const supabase = createClient()
  const callbackUrl = new URL('/auth/callback', window.location.origin)
  callbackUrl.searchParams.set('next', '/feed')
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: false,
      scopes: 'openid email profile',
      queryParams: {
        prompt: 'select_account',
      },
    },
  })
}export default function LoginPage() {
  async function handleGoogleSignIn() {
    const supabase = createClient()
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })
  }

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#09090b' }}
    >
      {/* Atmospheric glow — top right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80,
          right: -80,
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.28) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Atmospheric glow — bottom left */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 60,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 pt-16 pb-10">

        {/* Badge */}
        <div style={{ animation: 'slideUp 0.5s ease both' }}>
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-[0.14em] uppercase font-semibold"
            style={{
              fontFamily: 'var(--font-mono)',
              background: 'rgba(249,115,22,0.1)',
              color: '#f97316',
              border: '1px solid rgba(249,115,22,0.22)',
              letterSpacing: '0.14em',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block', boxShadow: '0 0 6px #f97316' }} />
            Become legendary
          </span>
        </div>

        {/* Hero text */}
        <div className="mt-6 mb-2" style={{ animation: 'slideUp 0.5s 0.08s ease both' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(80px, 24vw, 100px)',
              lineHeight: 0.88,
              letterSpacing: '-0.01em',
              color: '#fafafa',
              margin: 0,
            }}
          >
            FIT
            <br />
            <span style={{ color: '#f97316' }}>LEGEND</span>
          </h1>
        </div>

        {/* Divider */}
        <div
          className="my-7"
          style={{ animation: 'slideUp 0.5s 0.16s ease both' }}
        >
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, #f97316 0%, rgba(249,115,22,0.3) 50%, transparent 100%)',
            }}
          />
        </div>

        {/* Tagline */}
        <p
          className="text-[15px] leading-relaxed"
          style={{
            color: '#a1a1aa',
            animation: 'slideUp 0.5s 0.22s ease both',
          }}
        >
          Track every lift. Watch your numbers climb.<br />
          Share PRs with your crew.
        </p>

        {/* Feature chips */}
        <div
          className="flex flex-wrap gap-2 mt-6"
          style={{ animation: 'slideUp 0.5s 0.3s ease both' }}
        >
          {FEATURES.map((f) => (
            <span
              key={f}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#71717a',
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div
          className="flex gap-6 mt-8 pt-6"
          style={{
            borderTop: '1px solid #1c1c1f',
            animation: 'slideUp 0.5s 0.36s ease both',
          }}
        >
          {[
            { num: '50+', label: 'Exercises' },
            { num: 'Auto', label: 'PR detection' },
            { num: '∞', label: 'Gains' },
          ].map(({ num, label }) => (
            <div key={label}>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 24,
                  lineHeight: 1,
                  color: '#fafafa',
                  letterSpacing: '-0.01em',
                }}
              >
                {num}
              </p>
              <p className="text-xs mt-1" style={{ color: '#52525b' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sign in */}
        <div style={{ animation: 'slideUp 0.5s 0.44s ease both' }}>
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-[15px] transition-transform active:scale-[0.98]"
            style={{
              background: '#fff',
              color: '#111',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p
            className="text-center text-xs mt-4"
            style={{ color: '#3f3f46' }}
          >
            By continuing you agree to our terms of service
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
