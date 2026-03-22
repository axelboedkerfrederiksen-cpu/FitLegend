'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'

export default function SettingsPage() {
  const { user, profile, signOut, loading: authLoading } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setUsername(profile.username ?? '')
    }
  }, [profile])

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const { error: err } = await createClient()
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          username: username.trim() || null,
        })
        .eq('id', user.id)

      if (err) {
        if (err.code === '23505') {
          setError('That username is already taken.')
        } else {
          setError(err.message)
        }
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null
  const name = profile?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? ''

  if (authLoading) {
    return (
      <main className="min-h-screen pb-20 px-4 pt-12" style={{ background: 'var(--bg)' }}>
        <div className="h-6 w-24 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <UserAvatar avatarUrl={avatarUrl} displayName={name} size={72} />
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          {user?.email}
        </p>
      </div>

      {/* Form */}
      <div className="px-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Username
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-[10px] text-sm font-semibold text-white transition-opacity"
          style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
        </button>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            onClick={signOut}
            className="w-full py-3 rounded-[10px] text-sm font-semibold"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--danger)',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
