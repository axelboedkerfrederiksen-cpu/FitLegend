'use client'

import { useState } from 'react'
import { ChevronRight, Share2 } from 'lucide-react'
import { WorkoutWithSets, WorkoutSet } from '@/lib/types'
import { getExerciseDisplayType } from '@/lib/utils'

interface Props {
  workout: WorkoutWithSets
  isLast?: boolean
  onShareExercise?: (exerciseName: string, bestWeight: number, bestReps: number) => void
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
  if (type === 'cardio') return s.weight_kg > 0 ? `${s.reps} min · ${s.weight_kg} km` : `${s.reps} min`
  if (type === 'timed-core') return `${s.reps}s`
  return s.weight_kg > 0 ? `${s.sets} × ${s.reps} @ ${s.weight_kg}kg` : `${s.sets} × ${s.reps}`
}

function totalVolume(workout: WorkoutWithSets) {
  return workout.workout_sets.reduce((sum, s) => {
    if (getExerciseDisplayType(s.exercise_name) !== 'normal') return sum
    return sum + s.sets * s.reps * Number(s.weight_kg)
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

function bestSet(sets: WorkoutSet[]): WorkoutSet {
  return sets.reduce((best, s) => (Number(s.weight_kg) > Number(best.weight_kg) ? s : best), sets[0])
}

export default function WorkoutCard({ workout, isLast = false, onShareExercise }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [shared, setShared] = useState<Set<string>>(new Set())
  const exercises = uniqueExercises(workout)
  const volume = totalVolume(workout)

  const handleShare = (exerciseName: string, setsForExercise: WorkoutSet[]) => {
    if (!onShareExercise) return
    const best = bestSet(setsForExercise)
    onShareExercise(exerciseName, Number(best.weight_kg), best.reps)
    setShared((prev) => new Set(prev).add(exerciseName))
  }

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
            const isShared = shared.has(exRow.exercise_name)
            const canShare = !!onShareExercise && getExerciseDisplayType(exRow.exercise_name) === 'normal'

            return (
              <div
                key={exRow.exercise_name}
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {exRow.exercise_name}
                  </p>
                  {canShare && (
                    <button
                      onClick={() => handleShare(exRow.exercise_name, setsForExercise)}
                      disabled={isShared}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-opacity"
                      style={{
                        background: isShared ? 'transparent' : 'var(--accent-dim)',
                        color: isShared ? 'var(--success)' : 'var(--accent)',
                        border: isShared ? '1px solid var(--success)' : '1px solid transparent',
                        opacity: isShared ? 0.7 : 1,
                      }}
                    >
                      {isShared ? (
                        'Shared ✓'
                      ) : (
                        <>
                          <Share2 size={11} />
                          Share
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {setsForExercise.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
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
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{workout.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
