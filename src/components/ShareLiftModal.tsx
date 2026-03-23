'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Share2, Trophy, Search, Video, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UsernameModal from '@/components/UsernameModal'

interface ExerciseOption {
  exercise_name: string
  best_weight: number
  best_reps: number
  is_pr: boolean
}

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
  const [exercises, setExercises] = useState<ExerciseOption[]>([])
  const [loadingExercises, setLoadingExercises] = useState(!prefill)
  const [selected, setSelected] = useState<ExerciseOption | null>(null)
  const [search, setSearch] = useState('')
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [currentUsername, setCurrentUsername] = useState(username)
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  const currentType = prefill?.type ?? (selected?.is_pr ? 'pr' : selected ? 'lift' : null)

  useEffect(() => {
    if (prefill) return
    const load = async () => {
      const sb = createClient()
      const [setsRes, prsRes] = await Promise.allSettled([
        sb
          .from('workout_sets')
          .select('exercise_name, weight_kg, reps, workouts!inner(user_id)')
          .eq('workouts.user_id', userId),
        sb
          .from('personal_records')
          .select('exercise_name, weight_kg')
          .eq('user_id', userId),
      ])

      const sets = setsRes.status === 'fulfilled' ? (setsRes.value.data ?? []) : []
      const prMap = new Map<string, number>()
      if (prsRes.status === 'fulfilled') {
        for (const pr of prsRes.value.data ?? []) {
          prMap.set(pr.exercise_name, Number(pr.weight_kg))
        }
      }

      // Group by exercise name, find best weight & reps per exercise
      const byExercise = new Map<string, { weight: number; reps: number }>()
      for (const s of sets) {
        const w = Number(s.weight_kg)
        const existing = byExercise.get(s.exercise_name)
        if (!existing || w > existing.weight) {
          byExercise.set(s.exercise_name, { weight: w, reps: s.reps })
        }
      }

      const options: ExerciseOption[] = Array.from(byExercise.entries())
        .map(([name, { weight, reps }]) => ({
          exercise_name: name,
          best_weight: weight,
          best_reps: reps,
          is_pr: prMap.has(name) && Number(prMap.get(name)) === weight,
        }))
        .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))

      setExercises(options)
      setLoadingExercises(false)
    }
    load()
  }, [userId, prefill])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter((e) => e.exercise_name.toLowerCase().includes(q))
  }, [exercises, search])

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoError(null)
    const file = e.target.files?.[0] ?? null
    if (!file) return
    const MAX_MB = 100
    if (file.size > MAX_MB * 1024 * 1024) {
      setVideoError(`Video must be under ${MAX_MB} MB`)
      return
    }
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const removeVideo = () => {
    setVideoFile(null)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoPreview(null)
    setVideoError(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const doPost = async () => {
    if (!currentUsername) {
      setShowUsernameModal(true)
      return
    }
    setPosting(true)
    try {
      let video_url: string | null = null

      if (videoFile) {
        const sb = createClient()
        const ext = videoFile.name.split('.').pop() ?? 'mp4'
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await sb.storage
          .from('post-videos')
          .upload(path, videoFile, { contentType: videoFile.type, upsert: false })
        if (uploadError) {
          console.error('[ShareLiftModal] video upload:', uploadError.message)
          setVideoError('Video upload failed. Try again.')
          return
        }
        const { data: urlData } = sb.storage.from('post-videos').getPublicUrl(path)
        video_url = urlData.publicUrl
      }

      const payload = prefill
        ? { user_id: userId, type: prefill.type, exercise_name: prefill.exerciseName, weight_kg: prefill.weightKg, reps: prefill.reps, video_url }
        : selected
        ? { user_id: userId, type: selected.is_pr ? 'pr' as const : 'lift' as const, exercise_name: selected.exercise_name, weight_kg: selected.best_weight, reps: selected.best_reps, video_url }
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
        className="fixed inset-0 z-[100] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="w-full max-w-[480px] rounded-t-2xl px-5 pt-6 pb-24"
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
            /* Exercise picker */
            <div>
              {/* Search */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search exercises…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>

              {loadingExercises ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg)' }} />
                  ))}
                </div>
              ) : exercises.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No exercises logged yet. Complete a workout first.
                </p>
              ) : filtered.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No exercises match &ldquo;{search}&rdquo;
                </p>
              ) : (
                <div
                  className="rounded-xl overflow-hidden mb-5"
                  style={{ border: '1px solid var(--border)', maxHeight: 240, overflowY: 'auto' }}
                >
                  {filtered.map((ex, i) => {
                    const isSelected = selected?.exercise_name === ex.exercise_name
                    return (
                      <button
                        key={ex.exercise_name}
                        onClick={() => setSelected(ex)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--bg)',
                          borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {ex.is_pr && (
                            <Trophy size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          )}
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
                          >
                            {ex.exercise_name}
                          </p>
                        </div>
                        <p
                          className="text-sm font-bold tabular-nums flex-shrink-0 ml-3"
                          style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {ex.best_weight > 0 ? `${ex.best_weight} kg` : `${ex.best_reps} reps`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Video proof section — shown for PR posts */}
          {(currentType === 'pr' || currentType === null) && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Proof video (optional)</p>
              {videoPreview ? (
                <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <video
                    src={videoPreview}
                    controls
                    playsInline
                    className="w-full max-h-48 object-cover"
                    style={{ background: '#000' }}
                  />
                  <button
                    onClick={removeVideo}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                  >
                    <X size={14} style={{ color: '#fff' }} />
                  </button>
                  <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: 'rgba(0,0,0,0.4)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                    <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
                    <p className="text-xs font-medium" style={{ color: '#fff' }}>Ready to upload</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
                >
                  <Video size={16} />
                  Attach a video clip
                </button>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
              />
              {videoError && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertCircle size={13} style={{ color: '#ef4444' }} />
                  <p className="text-xs" style={{ color: '#ef4444' }}>{videoError}</p>
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
            {posted ? 'Posted ✓' : posting ? (videoFile ? 'Uploading…' : 'Posting…') : 'Post to feed'}
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
