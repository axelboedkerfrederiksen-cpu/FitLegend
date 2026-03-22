'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { FeedWorkout, WorkoutSet } from '@/lib/types'
import { getExerciseDisplayType } from '@/lib/utils'
import UserAvatar from '@/components/UserAvatar'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function setDetail(s: WorkoutSet): string {
  const type = getExerciseDisplayType(s.exercise_name)
  if (type === 'cardio') return s.weight_kg > 0 ? `${s.reps} min · ${s.weight_kg} km` : `${s.reps} min`
  if (type === 'timed-core') return `${s.reps}s`
  return s.weight_kg > 0 ? `${s.sets} × ${s.reps} @ ${s.weight_kg}kg` : `${s.sets} × ${s.reps}`
}

function uniqueExercises(workout: FeedWorkout) {
  const seen = new Set<string>()
  return workout.workout_sets.filter((s) => {
    if (seen.has(s.exercise_name)) return false
    seen.add(s.exercise_name)
    return true
  })
}

function totalVolume(workout: FeedWorkout) {
  return workout.workout_sets.reduce((sum, s) => {
    if (getExerciseDisplayType(s.exercise_name) !== 'normal') return sum
    return sum + s.sets * s.reps * Number(s.weight_kg)
  }, 0)
}

export default function FeedCard({ workout }: { workout: FeedWorkout }) {
  const [expanded, setExpanded] = useState(false)
  const profile = workout.profiles
  const exercises = uniqueExercises(workout)
  const volume = totalVolume(workout)
  const displayName = profile?.display_name ?? profile?.username ?? 'Unknown'

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* User header */}
      <Link href={`/profile/${profile?.id}`}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <UserAvatar avatarUrl={profile?.avatar_url ?? null} displayName={displayName} size={34} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </p>
          </div>
          <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(workout.created_at)}
          </p>
        </div>
      </Link>

      {/* Workout summary */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-4 py-3"
      >
        <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--text-secondary)' }}>
          {exercises.map((s) => s.exercise_name).join(' · ')}
        </p>
        {volume > 0 && (
          <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {volume.toLocaleString()} kg volume
          </p>
        )}
        <div className="flex items-center gap-1 mt-2">
          <p className="text-xs" style={{ color: 'var(--accent)' }}>
            {expanded ? 'Hide sets' : 'View sets'}
          </p>
          <ChevronDown
            size={12}
            style={{
              color: 'var(--accent)',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
            }}
          />
        </div>
      </button>

      {/* Expanded sets */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {exercises.map((exRow) => {
            const setsForExercise = workout.workout_sets.filter(
              (s) => s.exercise_name === exRow.exercise_name
            )
            return (
              <div
                key={exRow.exercise_name}
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {exRow.exercise_name}
                </p>
                <div className="flex flex-col gap-1">
                  {setsForExercise.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {setDetail(s)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {workout.notes && (
            <div className="px-4 py-3">
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{workout.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
