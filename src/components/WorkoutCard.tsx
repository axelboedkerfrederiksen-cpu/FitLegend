'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { WorkoutWithSets, WorkoutSet } from '@/lib/types'
import { getExerciseDisplayType } from '@/lib/utils'

interface Props {
  workout: WorkoutWithSets
  isLast?: boolean
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function setDetail(s: WorkoutSet): string {
  const type = getExerciseDisplayType(s.exercise_name)
  if (type === 'cardio') {
    return s.weight_kg > 0 ? `${s.reps} min · ${s.weight_kg} km` : `${s.reps} min`
  }
  if (type === 'timed-core') return `${s.reps}s`
  return s.weight_kg > 0 ? `${s.sets} × ${s.reps} @ ${s.weight_kg}kg` : `${s.sets} × ${s.reps}`
}

function totalVolume(workout: WorkoutWithSets) {
  return workout.workout_sets.reduce((sum, s) => {
    if (getExerciseDisplayType(s.exercise_name) !== 'normal') return sum
    return sum + s.sets * s.reps * s.weight_kg
  }, 0)
}

function uniqueExercises(workout: WorkoutWithSets) {
  const seen = new Set<string>()
  return workout.workout_sets.filter((s) => {
    if (seen.has(s.exercise_name)) return false
    seen.add(s.exercise_name)
    return true
  })
}

export default function WorkoutCard({ workout, isLast = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const exercises = uniqueExercises(workout)
  const volume = totalVolume(workout)

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full px-4 py-4 text-left"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatDate(workout.created_at)}
              </span>
              {workout.duration_minutes && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {workout.duration_minutes} min
                </span>
              )}
            </div>

            {/* Exercise names */}
            <p className="text-xs leading-relaxed truncate" style={{ color: 'var(--text-secondary)' }}>
              {exercises.map((s) => s.exercise_name).join(' · ')}
            </p>

            {volume > 0 && (
              <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {volume.toLocaleString()} kg volume
              </p>
            )}
          </div>

          <ChevronRight
            size={16}
            style={{
              color: 'var(--text-muted)',
              flexShrink: 0,
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s',
              marginTop: 2,
            }}
          />
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
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
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold flex-shrink-0 tabular-nums"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}
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
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                {workout.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
