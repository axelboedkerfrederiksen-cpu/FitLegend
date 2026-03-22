'use client'

import { useEffect, useState } from 'react'
import { X, Share2, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PersonalRecord } from '@/lib/types'
import UsernameModal from '@/components/UsernameModal'

interface Props {
  userId: string
  username: string | null | undefined
  /** If provided, skip the picker and go straight to confirm */
  prefill?: { exerciseName: string; weightKg: number; reps: number; type: 'pr' | 'lift' }
  onClose: () => void
  onPosted?: () => void
  onUsernameSet?: (username: string) => void
}

export default function ShareLiftModal({ userId, username, prefill, onClose, onPosted, onUsernameSet }: Props) {
  const [prs, setPrs] = useState<PersonalRecord[]>([])
  const [loadingPRs, setLoadingPRs] = useState(!prefill)
  const [selected, setSelected] = useState<PersonalRecord | null>(null)
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [currentUsername, setCurrentUsername] = useState(username)
  const [showUsernameModal, setShowUsernameModal] = useState(false)

  useEffect(() => {
    if (prefill) return
    const load = async () => {
      const { data } = await createClient()
        .from('personal_records')
        .select('*')
        .eq('user_id', userId)
        .order('weight_kg', { ascending: false })
      setPrs((data as PersonalRecord[]) ?? [])
      setLoadingPRs(false)
    }
    load()
  }, [userId, prefill])

  const doPost = async () => {
    if (!currentUsername) {
      setShowUsernameModal(true)
      return
    }
    setPosting(true)
    try {
      const payload = prefill
        ? { user_id: userId, type: prefill.type, exercise_name: prefill.exerciseName, weight_kg: prefill.weightKg, reps: prefill.reps }
        : selected
        ? { user_id: userId, type: 'pr' as const, exercise_name: selected.exercise_name, weight_kg: selected.weight_kg, reps: selected.reps }
        : null
      if (!payload) return
      const { error } = await createClient().from('posts').insert(payload)
      if (error) console.error('[ShareLiftModal] post insert:', error.message)
      else {
        setPosted(true)
        onPosted?.()
        setTimeout(onClose, 900)
      }
    } finally {
      setPosting(false)
    }
  }

  const handleUsernameModalSaved = async () => {
    const { data } = await createClient()
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()
    const saved = data?.username ?? null
    setCurrentUsername(saved)
    if (saved) onUsernameSet?.(saved)
    setShowUsernameModal(false)
    doPost()
  }

  const canPost = prefill ? true : !!selected

  return (
    <>
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Share to feed
            </p>
            <button onClick={onClose}>
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Prefill confirm view */}
          {prefill ? (
            <div
              className="p-4 rounded-xl mb-5 flex items-center gap-3"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-dim)' }}
              >
                {prefill.type === 'pr'
                  ? <Trophy size={18} style={{ color: 'var(--accent)' }} />
                  : <Share2 size={18} style={{ color: 'var(--accent)' }} />
                }
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {prefill.exerciseName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {prefill.weightKg} kg{prefill.reps > 0 ? ` × ${prefill.reps} reps` : ''}
                  {prefill.type === 'pr' && (
                    <span className="ml-2 font-semibold" style={{ color: 'var(--accent)' }}>PR</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            /* PR picker */
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                Pick a PR to share
              </p>
              {loadingPRs ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg)' }} />
                  ))}
                </div>
              ) : prs.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No personal records yet. Log a workout first.
                </p>
              ) : (
                <div
                  className="rounded-xl overflow-hidden mb-5 max-h-64 overflow-y-auto"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {prs.map((pr, i) => (
                    <button
                      key={pr.id}
                      onClick={() => setSelected(pr)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                      style={{
                        background: selected?.id === pr.id ? 'var(--accent-dim)' : 'var(--bg)',
                        borderBottom: i < prs.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: selected?.id === pr.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {pr.exercise_name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {pr.reps > 0 ? `${pr.reps} reps` : ''}
                        </p>
                      </div>
                      <p
                        className="text-sm font-bold tabular-nums"
                        style={{ color: selected?.id === pr.id ? 'var(--accent)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {pr.weight_kg} kg
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={doPost}
            disabled={!canPost || posting || posted}
            className="w-full py-3 rounded-[10px] text-sm font-semibold transition-opacity"
            style={{
              background: posted ? 'transparent' : 'var(--accent)',
              color: posted ? 'var(--success)' : '#fff',
              border: posted ? '1px solid var(--success)' : 'none',
              opacity: (!canPost || posting) && !posted ? 0.4 : 1,
            }}
          >
            {posted ? 'Posted ✓' : posting ? 'Posting…' : 'Post to feed'}
          </button>
        </div>
      </div>

      {showUsernameModal && (
        <UsernameModal
          userId={userId}
          onSaved={handleUsernameModalSaved}
          onClose={() => setShowUsernameModal(false)}
        />
      )}
    </>
  )
}
