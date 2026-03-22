'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, TrendingUp, Share2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { PersonalRecord } from '@/lib/types'
import ProgressChart from '@/components/ProgressChart'
import ShareLiftModal from '@/components/ShareLiftModal'

interface PRRow extends PersonalRecord {}

export default function ProgressPage() {
  const { user, profile, loading: authLoading } = useAuth()

  const [exercises, setExercises] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [currentPR, setCurrentPR] = useState<PRRow | null>(null)
  const [allPRs, setAllPRs] = useState<PRRow[]>([])
  const [loadingExercises, setLoadingExercises] = useState(true)
  const [loadingPR, setLoadingPR] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentUsername, setCurrentUsername] = useState<string | null | undefined>(profile?.username)

  // Load exercises the user has actually logged + all PRs
  useEffect(() => {
    if (!user) return

    const load = async () => {
      setLoadingExercises(true)
      try {
        const [setsRes, prsRes] = await Promise.allSettled([
          withTimeout(
            createClient()
              .from('workout_sets')
              .select('exercise_name, workouts!inner(user_id)')
              .eq('workouts.user_id', user.id)
          ),
          withTimeout(
            createClient()
              .from('personal_records')
              .select('*')
              .eq('user_id', user.id)
              .order('weight_kg', { ascending: false })
          ),
        ])

        if (setsRes.status === 'fulfilled' && !setsRes.value.error) {
          const names = [
            ...new Set((setsRes.value.data ?? []).map((r: { exercise_name: string }) => r.exercise_name)),
          ].sort() as string[]
          setExercises(names)
          if (names.length > 0) setSelected(names[0])
        }

        if (prsRes.status === 'fulfilled' && !prsRes.value.error) {
          setAllPRs((prsRes.value.data as PRRow[]) ?? [])
        }
      } catch (err) {
        console.error('[ProgressPage] load threw:', err)
      } finally {
        setLoadingExercises(false)
      }
    }

    load()
  }, [user])

  // Load PR for selected exercise
  useEffect(() => {
    if (!user || !selected) return

    const load = async () => {
      setLoadingPR(true)
      try {
        const { data, error } = await withTimeout(
          createClient()
            .from('personal_records')
            .select('*')
            .eq('user_id', user.id)
            .eq('exercise_name', selected)
            .maybeSingle()
        )
        if (error) console.error('[ProgressPage] PR fetch:', error.message)
        setCurrentPR((data as PRRow) ?? null)
      } catch (err) {
        console.error('[ProgressPage] PR fetch threw:', err)
      } finally {
        setLoadingPR(false)
      }
    }

    load()
  }, [user, selected])

  if (authLoading || loadingExercises) {
    return (
      <main className="min-h-screen pb-20 px-4 pt-12" style={{ background: 'var(--bg)' }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Progress</h1>
        <div className="space-y-3">
          <div className="h-11 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          <div className="h-52 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
        </div>
      </main>
    )
  }

  if (exercises.length === 0) {
    return (
      <main className="min-h-screen pb-20 px-4 pt-12" style={{ background: 'var(--bg)' }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Progress</h1>
        <div className="flex flex-col items-center gap-3 pt-16 text-center">
          <TrendingUp size={36} style={{ color: 'var(--text-muted)' }} />
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            No workout data yet
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Log your first workout to see progress here
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-20 px-4 pt-12" style={{ background: 'var(--bg)' }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Progress</h1>

      {/* Exercise dropdown */}
      <div className="relative mb-5">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <span>{selected}</span>
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-muted)',
              transform: dropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden max-h-60 overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {exercises.map((ex, i) => (
              <button
                key={ex}
                onClick={() => { setSelected(ex); setDropdownOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                style={{
                  color: ex === selected ? 'var(--accent)' : 'var(--text-primary)',
                  background: ex === selected ? 'var(--accent-dim)' : 'transparent',
                  borderBottom: i < exercises.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PR badge for selected exercise */}
      {selected && (
        <div
          className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
              Personal Record
            </p>
            {loadingPR ? (
              <div className="h-8 w-24 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            ) : currentPR ? (
              <p
                className="text-3xl font-bold"
                style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}
              >
                {currentPR.weight_kg} kg
              </p>
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>—</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentPR && (
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(currentPR.achieved_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {currentPR.reps > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {currentPR.reps} reps
                  </p>
                )}
              </div>
            )}
            {currentPR && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
              >
                <Share2 size={12} />
                Share
              </button>
            )}
          </div>
        </div>
      )}

      {showShareModal && user && currentPR && selected && (
        <ShareLiftModal
          userId={user.id}
          username={currentUsername}
          prefill={{ exerciseName: selected, weightKg: Number(currentPR.weight_kg), reps: currentPR.reps, type: 'pr' }}
          onClose={() => setShowShareModal(false)}
          onUsernameSet={(u) => setCurrentUsername(u)}
        />
      )}

      {/* Chart */}
      {selected && user && (
        <div className="mb-8">
          <ProgressChart exerciseName={selected} userId={user.id} />
        </div>
      )}

      {/* All PRs */}
      {allPRs.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            All personal records
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {allPRs.map((pr, i) => (
              <div
                key={pr.id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: 'var(--surface)',
                  borderBottom: i < allPRs.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {pr.exercise_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(pr.achieved_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <p
                  className="text-base font-bold"
                  style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {pr.weight_kg} kg
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
