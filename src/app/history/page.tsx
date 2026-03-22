'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useWorkouts } from '@/hooks/useWorkouts'
import { createClient } from '@/lib/supabase/client'
import { WorkoutWithSets } from '@/lib/types'
import { getExerciseDisplayType } from '@/lib/utils'
import WorkoutCard from '@/components/WorkoutCard'

type Period = 'today' | 'week' | 'month' | 'year'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
]

function periodStart(period: Period): Date {
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') {
    const d = new Date(now)
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1 // Monday start
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return new Date(now.getFullYear(), 0, 1) // year
}

function weeksInPeriod(period: Period): number {
  if (period === 'today') return 1
  if (period === 'week') return 1
  if (period === 'month') return new Date().getDate() / 7
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear / 7
}

function fmtVolume(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`
  return Math.round(kg).toLocaleString()
}

function groupByDate(workouts: WorkoutWithSets[]): { label: string; workouts: WorkoutWithSets[] }[] {
  const map = new Map<string, WorkoutWithSets[]>()
  for (const w of workouts) {
    const key = w.created_at.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(w)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([iso, ws]) => {
      const d = new Date(iso)
      const now = new Date()
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
      let label: string
      if (diff === 0) label = 'Today'
      else if (diff === 1) label = 'Yesterday'
      else label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      return { label, workouts: ws }
    })
}

function computeStats(workouts: WorkoutWithSets[], period: Period) {
  const totalWorkouts = workouts.length
  const totalVolume = workouts.reduce((sum, w) =>
    sum + w.workout_sets.reduce((s, set) =>
      getExerciseDisplayType(set.exercise_name) === 'normal'
        ? s + set.sets * set.reps * Number(set.weight_kg)
        : s, 0), 0)
  const totalSets = workouts.reduce((sum, w) => sum + w.workout_sets.length, 0)

  const weeks = weeksInPeriod(period)
  const avgPerWeek = weeks > 0 ? totalWorkouts / weeks : 0

  const exerciseCounts = new Map<string, number>()
  workouts.forEach((w) => w.workout_sets.forEach((s) => {
    exerciseCounts.set(s.exercise_name, (exerciseCounts.get(s.exercise_name) ?? 0) + 1)
  }))
  const topExercise = [...exerciseCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const muscleCount = new Map<string, number>()
  workouts.forEach((w) => {
    const seen = new Set<string>()
    w.workout_sets.forEach((s) => {
      if (!seen.has(s.exercise_name)) {
        seen.add(s.exercise_name)
      }
    })
  })

  return { totalWorkouts, totalVolume, totalSets, avgPerWeek, topExercise }
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const { workouts, loading: workoutsLoading, error, refetch } = useWorkouts(user?.id ?? null)
  const [period, setPeriod] = useState<Period>('week')

  const loading = authLoading || workoutsLoading

  const filtered = useMemo(() => {
    const start = periodStart(period)
    return workouts.filter((w) => new Date(w.created_at) >= start)
  }, [workouts, period])

  const stats = useMemo(() => computeStats(filtered, period), [filtered, period])
  const groups = useMemo(() => groupByDate(filtered), [filtered])

  const handleShareExercise = async (exerciseName: string, bestWeight: number, bestReps: number) => {
    if (!user) return
    const { error } = await createClient().from('posts').insert({
      user_id: user.id,
      type: 'lift',
      exercise_name: exerciseName,
      weight_kg: bestWeight,
      reps: bestReps,
    })
    if (error) console.error('[HistoryPage] share lift:', error.message)
  }

  const statCards = [
    { label: 'Workouts', value: stats.totalWorkouts > 0 ? String(stats.totalWorkouts) : '—' },
    { label: 'Volume', value: stats.totalVolume > 0 ? `${fmtVolume(stats.totalVolume)} kg` : '—' },
    { label: 'Total sets', value: stats.totalSets > 0 ? String(stats.totalSets) : '—' },
    {
      label: period === 'today' ? 'Exercises' : 'Avg / week',
      value: period === 'today'
        ? (stats.totalSets > 0 ? String(new Set(filtered.flatMap(w => w.workout_sets.map(s => s.exercise_name))).size) : '—')
        : (stats.totalWorkouts > 0 ? stats.avgPerWeek.toFixed(1) : '—'),
    },
  ]

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>History</h1>
        <Link href="/log">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Log
          </div>
        </Link>
      </div>

      {/* Period filter tabs */}
      <div className="px-4 mb-5">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: period === key ? 'var(--accent)' : 'transparent',
                color: period === key ? '#fff' : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="px-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
            ))}
          </div>
          <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 pt-16 text-center px-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Couldn&apos;t load workouts.</p>
          <button onClick={refetch} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
            Tap to retry
          </button>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          {workouts.length > 0 && (
            <div className="px-4 mb-5">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {statCards.map((s) => (
                  <div
                    key={s.label}
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p
                      className="text-2xl font-bold"
                      style={{ color: s.value !== '—' ? 'var(--text-primary)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {s.value}
                    </p>
                    <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Top exercise banner */}
              {stats.topExercise && filtered.length > 0 && (
                <div
                  className="px-4 py-2.5 rounded-xl flex items-center justify-between"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Most trained</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.topExercise}</p>
                </div>
              )}
            </div>
          )}

          {/* Workout list */}
          {filtered.length === 0 ? (
            <div className="px-4 pt-12 flex flex-col items-center gap-3 text-center">
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {workouts.length === 0 ? 'No workouts yet' : `No workouts this ${period}`}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {workouts.length === 0 ? 'Log your first session to see it here' : 'Switch to a longer period or log a workout'}
              </p>
              <Link href="/log">
                <div className="mt-2 px-4 py-2 rounded-[10px] font-semibold text-sm text-white" style={{ background: 'var(--accent)' }}>
                  Log Workout
                </div>
              </Link>
            </div>
          ) : (
            <div className="px-4 space-y-5">
              {groups.map(({ label, workouts: group }) => (
                <div key={label}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {group.map((w, i) => (
                      <WorkoutCard
                        key={w.id}
                        workout={w}
                        isLast={i === group.length - 1}
                        onShareExercise={handleShareExercise}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
