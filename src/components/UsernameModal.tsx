'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  onSaved: () => void
  onClose: () => void
}

export default function UsernameModal({ userId, onSaved, onClose }: Props) {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced availability check
  useEffect(() => {
    const clean = value.trim()
    if (clean.length < 3) { setAvailable(null); return }
    setChecking(true)
    const t = setTimeout(async () => {
      const { data } = await createClient()
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', userId)
        .maybeSingle()
      setAvailable(!data)
      setChecking(false)
    }, 400)
    return () => clearTimeout(t)
  }, [value, userId])

  const handleChange = (raw: string) => {
    setValue(raw.toLowerCase().replace(/[^a-z0-9_]/g, ''))
    setAvailable(null)
    setError(null)
  }

  const save = async () => {
    const clean = value.trim()
    if (!clean || clean.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (available === false) { setError('That username is taken.'); return }
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await createClient()
        .from('profiles')
        .update({ username: clean })
        .eq('id', userId)
      if (err) {
        if (err.code === '23505') setError('That username is already taken.')
        else setError(err.message)
      } else {
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  const hint = () => {
    const clean = value.trim()
    if (clean.length === 0) return null
    if (clean.length < 3) return { text: 'At least 3 characters', ok: false }
    if (checking) return { text: 'Checking…', ok: null }
    if (available === true) return { text: '@' + clean + ' is available ✓', ok: true }
    if (available === false) return { text: 'Already taken', ok: false }
    return null
  }

  const h = hint()
  const canSave = value.trim().length >= 3 && available === true && !saving

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[480px] rounded-t-2xl px-5 pt-6 pb-10"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Set your username
          </p>
          <button onClick={onClose}>
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          You need a username before posting to the feed. It must be unique.
        </p>

        {/* Input */}
        <div className="relative mb-2">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            @
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="your_username"
            maxLength={24}
            className="w-full pl-7 pr-3 py-3 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg)',
              border: `1px solid ${h?.ok === true ? 'var(--success)' : h?.ok === false ? 'var(--danger)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSave) save() }}
          />
        </div>

        {/* Hint */}
        {h && (
          <p
            className="text-xs mb-4"
            style={{ color: h.ok === true ? 'var(--success)' : h.ok === false ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            {h.text}
          </p>
        )}
        {error && (
          <p className="text-xs mb-4" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <button
          onClick={save}
          disabled={!canSave}
          className="w-full py-3 rounded-[10px] text-sm font-semibold transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff', opacity: canSave ? 1 : 0.4 }}
        >
          {saving ? 'Saving…' : 'Save username'}
        </button>
      </div>
    </div>
  )
}
