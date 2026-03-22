'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, X, Check, Star, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { Exercise } from '@/lib/types'

type MuscleGroupOption = 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio'
type FilterOption = 'Recent' | 'Favorites' | 'All' | 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio'
const FILTERS: FilterOption[] = ['Recent', 'Favorites', 'All', 'Push', 'Pull', 'Legs', 'Core', 'Cardio']
const MUSCLE_GROUPS: MuscleGroupOption[] = ['Push', 'Pull', 'Legs', 'Core', 'Cardio']

function hashToNegId(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h > 0 ? -h : h - 1
}

interface Props {
  selected: Exercise[]
  onSelectionChange: (exercises: Exercise[]) => void
  onNext: () => void
  userId?: string
}

export default function ExercisePicker({ selected, onSelectionChange, onNext, userId }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterOption>('All')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [recentNames, setRecentNames] = useState<string[]>([])

  // Custom exercise form
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customGroup, setCustomGroup] = useState<MuscleGroupOption>('Push')
  const [savingCustom, setSavingCustom] = useState(false)

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queries: Promise<unknown>[] = [
        withTimeout(
          supabase.from('exercises').select('*').order('muscle_group').order('name')
        ),
      ]

      if (userId) {
        queries.push(
          withTimeout(
            supabase
              .from('user_exercises')
              .select('*')
              .eq('user_id', userId)
              .order('name')
          ),
          withTimeout(
            supabase
              .from('exercise_favorites')
              .select('exercise_name')
              .eq('user_id', userId)
          ),
          withTimeout(
            supabase
              .from('workout_sets')
              .select('exercise_name, workouts!inner(user_id)')
              .eq('workouts.user_id', userId)
              .order('created_at', { ascending: false })
              .limit(50)
          ),
        )
      }

      const results = await Promise.allSettled(queries)

      const stdRes = results[0] as PromiseSettledResult<{ data: Exercise[] | null; error: unknown }>
      if (stdRes.status === 'rejected' || (stdRes.status === 'fulfilled' && stdRes.value.error)) {
        setError('Could not load exercises.')
        return
      }
      const stdExercises: Exercise[] = (stdRes.value.data ?? [])

      let customExercises: Exercise[] = []
      if (userId && results[1]) {
        const customRes = results[1] as PromiseSettledResult<{ data: Array<{ name: string; muscle_group: MuscleGroupOption; user_id: string }> | null; error: unknown }>
        if (customRes.status === 'fulfilled' && !customRes.value.error) {
          customExercises = (customRes.value.data ?? []).map((r) => ({
            id: hashToNegId(r.name),
            name: r.name,
            muscle_group: r.muscle_group,
            icon: '',
            is_custom: true,
          }))
        }
      }

      // Merge: custom first, then standard (deduplicate by name)
      const existingNames = new Set(stdExercises.map((e) => e.name))
      const merged = [
        ...customExercises,
        ...stdExercises,
        ...customExercises.filter((c) => !existingNames.has(c.name)),
      ].filter((e, i, arr) => arr.findIndex((x) => x.name === e.name) === i)

      setExercises(merged)

      if (userId && results[2]) {
        const favRes = results[2] as PromiseSettledResult<{ data: Array<{ exercise_name: string }> | null; error: unknown }>
        if (favRes.status === 'fulfilled' && !favRes.value.error) {
          setFavorites(new Set((favRes.value.data ?? []).map((r) => r.exercise_name)))
        }
      }

      if (userId && results[3]) {
        const recentRes = results[3] as PromiseSettledResult<{ data: Array<{ exercise_name: string }> | null; error: unknown }>
        if (recentRes.status === 'fulfilled' && !recentRes.value.error) {
          const seen = new Set<string>()
          const recent: string[] = []
          for (const r of recentRes.value.data ?? []) {
            if (!seen.has(r.exercise_name)) {
              seen.add(r.exercise_name)
              recent.push(r.exercise_name)
              if (recent.length >= 5) break
            }
          }
          setRecentNames(recent)
        }
      }
    } catch (err) {
      console.error('[ExercisePicker] threw:', err)
      setError('Could not load exercises.')
    } finally {
      setLoading(false)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  const toggleFavorite = async (ex: Exercise, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId) return
    const isFav = favorites.has(ex.name)
    // Optimistic update
    setFavorites((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(ex.name)
      else next.add(ex.name)
      return next
    })
    if (isFav) {
      await supabase
        .from('exercise_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_name', ex.name)
    } else {
      await supabase
        .from('exercise_favorites')
        .upsert({ user_id: userId, exercise_name: ex.name }, { onConflict: 'user_id,exercise_name' })
    }
  }

  const saveCustomExercise = async () => {
    if (!userId || !customName.trim()) return
    setSavingCustom(true)
    try {
      const name = customName.trim()
      const { error: err } = await supabase
        .from('user_exercises')
        .upsert({ user_id: userId, name, muscle_group: customGroup }, { onConflict: 'user_id,name' })
      if (err) {
        console.error('[ExercisePicker] custom exercise insert:', err.message)
        return
      }
      const newEx: Exercise = {
        id: hashToNegId(name),
        name,
        muscle_group: customGroup,
        icon: '',
        is_custom: true,
      }
      setExercises((prev) => {
        if (prev.some((e) => e.name === name)) return prev
        return [newEx, ...prev]
      })
      onSelectionChange([...selected, newEx])
      setCustomName('')
      setShowCustomForm(false)
    } finally {
      setSavingCustom(false)
    }
  }

  const filtered = exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'All') return true
    if (filter === 'Favorites') return favorites.has(ex.name)
    if (filter === 'Recent') return recentNames.includes(ex.name)
    return ex.muscle_group === filter
  })

  // Sort recent by recency order
  const displayList = filter === 'Recent'
    ? [...filtered].sort((a, b) => recentNames.indexOf(a.name) - recentNames.indexOf(b.name))
    : filtered

  const isSelected = (ex: Exercise) => selected.some((s) => s.id === ex.id || s.name === ex.name)

  const toggle = (ex: Exercise) => {
    if (isSelected(ex)) {
      onSelectionChange(selected.filter((s) => s.name !== ex.name))
    } else {
      onSelectionChange([...selected, ex])
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 0 }}>
      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search exercises"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: active ? 'var(--accent-dim)' : 'var(--surface)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: active ? '1px solid var(--accent-border)' : '1px solid var(--border)',
              }}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex justify-center pt-12">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 pt-12">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Tap to retry
            </button>
          </div>
        ) : displayList.length === 0 && !showCustomForm ? (
          <p className="text-center pt-12 text-sm" style={{ color: 'var(--text-muted)' }}>No exercises found</p>
        ) : (
          <div>
            {displayList.length > 0 && (
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                {displayList.map((ex, i) => {
                  const sel = isSelected(ex)
                  const isFav = favorites.has(ex.name)
                  return (
                    <div
                      key={ex.name}
                      onClick={() => toggle(ex)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && toggle(ex)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
                      style={{
                        background: sel ? 'var(--accent-dim)' : 'var(--surface)',
                        borderBottom: i < displayList.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: sel ? 'var(--accent)' : 'transparent',
                          border: sel ? 'none' : '1.5px solid var(--border)',
                        }}
                      >
                        {sel && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>

                      <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                        {ex.name}
                        {ex.is_custom && (
                          <span className="ml-1.5 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                            custom
                          </span>
                        )}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {ex.muscle_group}
                      </span>

                      {userId && (
                        <button
                          onClick={(e) => toggleFavorite(ex, e)}
                          className="ml-1 flex-shrink-0 w-6 h-6 flex items-center justify-center"
                        >
                          <Star
                            size={14}
                            fill={isFav ? 'var(--accent)' : 'none'}
                            style={{ color: isFav ? 'var(--accent)' : 'var(--text-muted)' }}
                          />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add custom exercise */}
            {userId && (
              <div className="mt-3">
                {!showCustomForm ? (
                  <button
                    onClick={() => setShowCustomForm(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--accent)',
                    }}
                  >
                    <Plus size={14} />
                    Add custom exercise
                  </button>
                ) : (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                      New custom exercise
                    </p>
                    <input
                      type="text"
                      placeholder="Exercise name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {MUSCLE_GROUPS.map((mg) => (
                        <button
                          key={mg}
                          onClick={() => setCustomGroup(mg)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            background: customGroup === mg ? 'var(--accent-dim)' : 'var(--bg)',
                            color: customGroup === mg ? 'var(--accent)' : 'var(--text-secondary)',
                            border: customGroup === mg ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                          }}
                        >
                          {mg}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowCustomForm(false); setCustomName('') }}
                        className="flex-1 py-2 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCustomExercise}
                        disabled={!customName.trim() || savingCustom}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
                        style={{ background: 'var(--accent)', opacity: !customName.trim() || savingCustom ? 0.5 : 1 }}
                      >
                        {savingCustom ? 'Saving…' : 'Save & select'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="w-full py-3 rounded-[10px] font-semibold text-sm text-white transition-opacity"
          style={{
            background: 'var(--accent)',
            opacity: selected.length === 0 ? 0.4 : 1,
          }}
        >
          {selected.length === 0
            ? 'Select exercises to continue'
            : `Continue with ${selected.length} exercise${selected.length > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
