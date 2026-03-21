'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { Exercise } from '@/lib/types'

type MuscleGroup = 'All' | 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio'
const FILTERS: MuscleGroup[] = ['All', 'Push', 'Pull', 'Legs', 'Core', 'Cardio']

interface Props {
  selected: Exercise[]
  onSelectionChange: (exercises: Exercise[]) => void
  onNext: () => void
}

export default function ExercisePicker({ selected, onSelectionChange, onNext }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MuscleGroup>('All')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('exercises')
          .select('*')
          .order('muscle_group')
          .order('name')
      )
      if (error) {
        console.error('[ExercisePicker]', error.message, error.code)
        setError('Could not load exercises.')
      } else {
        setExercises(data ?? [])
      }
    } catch (err) {
      console.error('[ExercisePicker] threw:', err)
      setError('Could not load exercises.')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  const filtered = exercises.filter((ex) => {
    const matchGroup = filter === 'All' || ex.muscle_group === filter
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    return matchGroup && matchSearch
  })

  const isSelected = (ex: Exercise) => selected.some((s) => s.id === ex.id)

  const toggle = (ex: Exercise) => {
    if (isSelected(ex)) {
      onSelectionChange(selected.filter((s) => s.id !== ex.id))
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
        ) : filtered.length === 0 ? (
          <p className="text-center pt-12 text-sm" style={{ color: 'var(--text-muted)' }}>No exercises found</p>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {filtered.map((ex, i) => {
              const sel = isSelected(ex)
              return (
                <button
                  key={ex.id}
                  onClick={() => toggle(ex)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    background: sel ? 'var(--accent-dim)' : 'var(--surface)',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
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
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {ex.muscle_group}
                  </span>
                </button>
              )
            })}
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
