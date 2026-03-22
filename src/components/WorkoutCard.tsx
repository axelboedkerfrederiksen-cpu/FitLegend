'use client'

import { useState } from 'react'
import { ChevronRight, Share2, Trash2, LayoutTemplate } from 'lucide-react'
import { WorkoutWithSets, WorkoutSet } from '@/lib/types'
import { getExerciseDisplayType } from '@/lib/utils'
import { fmtWeight, UnitPref } from '@/lib/units'

interface Props {
  workout: WorkoutWithSets
  isLast?: boolean
  onShareExercise?: (exerciseName: string, bestWeight: number, bestReps: number) => void
  onDelete?: () => void
  onSaveAsTemplate?: (name: string) => Promise<void>
  unit?: UnitPref
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

function setDetail(s: WorkoutSet, unit: UnitPref = 'kg'): string {
  const type = getExerciseDisplayType(s.exercise_name)
  if (type === 'cardio') return s.weight_kg > 0 ? `${s.reps} min · ${s.weight_kg} km` : `${s.reps} min`
  if (type === 'timed-core') return `${s.reps}s`
  return s.weight_kg > 0
    ? `${s.sets} × ${s.reps} @ ${fmtWeight(Number(s.weight_kg), unit)}`
    : `${s.sets} × ${s.reps}`
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

export default function WorkoutCard({ workout, isLast = false, onShareExercise, onDelete, onSaveAsTemplate, unit = 'kg' }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [shared, setShared] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showTemplateInput, setShowTemplateInput] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)

  const exercises = uniqueExercises(workout)
  const volume = totalVolume(workout)

  const handleShare = (exerciseName: string, setsForExercise: WorkoutSet[]) => {
    if (!onShareExercise) return
    const best = bestSet(setsForExercise)
    onShareExercise(exerciseName, Number(best.weight_kg), best.reps)
    setShared((prev) => new Set(prev).add(exerciseName))
  }

  const handleSaveTemplate = async () => {
    if (!onSaveAsTemplate || !templateName.trim()) return
    setSavingTemplate(true)
    try {
      await onSaveAsTemplate(templateName.trim())
      setTemplateSaved(true)
      setShowTemplateInput(false)
      setTemplateName('')
      setTimeout(() => setTemplateSaved(false), 2000)
    } finally {
      setSavingTemplate(false)
    }
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
                {fmtWeight(volume, unit)} volume
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
                        {setDetail(s, unit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {workout.notes && (
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{workout.notes}</p>
            </div>
          )}

          {/* Footer actions */}
          <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ flexWrap: 'wrap' }}>
            {/* Save as template */}
            {onSaveAsTemplate && (
              <div className="flex items-center gap-2 flex-1">
                {templateSaved ? (
                  <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>Template saved ✓</span>
                ) : showTemplateInput ? (
                  <>
                    <input
                      type="text"
                      placeholder="Template name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded-md text-xs outline-none"
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        minWidth: 0,
                      }}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate() }}
                    />
                    <button
                      onClick={() => { setShowTemplateInput(false); setTemplateName('') }}
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim() || savingTemplate}
                      className="text-xs px-2 py-1 rounded-md font-semibold text-white transition-opacity"
                      style={{ background: 'var(--accent)', opacity: !templateName.trim() || savingTemplate ? 0.5 : 1 }}
                    >
                      {savingTemplate ? '…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowTemplateInput(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <LayoutTemplate size={12} />
                    Save as template
                  </button>
                )}
              </div>
            )}

            {onDelete && (
              <div className="flex justify-end">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Delete this workout?</span>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onDelete}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold"
                      style={{ background: 'var(--danger)', color: '#fff' }}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={12} />
                    Delete workout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
