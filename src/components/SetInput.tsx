'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Exercise } from '@/lib/types'
import { getExerciseDisplayType, ExerciseDisplayType } from '@/lib/utils'

// Storage semantics by exercise type:
//   normal    → reps = reps,             weight_kg = kg
//   cardio    → reps = duration_minutes, weight_kg = distance_km (0 = not set)
//   timed-core→ reps = duration_seconds, weight_kg = 0
export interface SetRow {
  reps: number
  weight_kg: number
}

export interface ExerciseSets {
  exercise: Exercise
  sets: SetRow[]
}

export function defaultRow(type: ExerciseDisplayType): SetRow {
  if (type === 'cardio') return { reps: 30, weight_kg: 0 }
  if (type === 'timed-core') return { reps: 30, weight_kg: 0 }
  return { reps: 10, weight_kg: 0 }
}

// ─── Editable stepper ────────────────────────────────────────────────────────

interface StepperProps {
  value: number
  step: number
  min: number
  integer?: boolean
  onChange: (n: number) => void
}

function fmtNum(n: number, integer: boolean) {
  if (integer) return String(Math.round(n))
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function EditableStepper({ value, step, min, integer = false, onChange }: StepperProps) {
  const [raw, setRaw] = useState(() => fmtNum(value, integer))
  const typing = useRef(false)

  useEffect(() => {
    if (!typing.current) setRaw(fmtNum(value, integer))
  }, [value, integer])

  const commit = (s: string) => {
    typing.current = false
    const n = parseFloat(s)
    const clamped = isNaN(n) ? value : Math.max(min, integer ? Math.round(n) : Math.round(n * 10) / 10)
    onChange(clamped)
    setRaw(fmtNum(clamped, integer))
  }

  const applyDelta = (delta: number) => {
    const next = Math.max(min, Math.round((value + delta) * 100) / 100)
    onChange(next)
    setRaw(fmtNum(next, integer))
    typing.current = false
  }

  return (
    <div
      className="flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
    >
      <button
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => applyDelta(-step)}
        className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-base font-bold transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        −
      </button>
      <input
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        value={raw}
        onChange={(e) => {
          const v = e.target.value
          if ((integer ? /^\d*$/ : /^\d*\.?\d*$/).test(v)) {
            typing.current = true
            setRaw(v)
          }
        }}
        onBlur={(e) => commit(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="bg-transparent outline-none text-center text-sm font-semibold tabular-nums"
        style={{
          width: 40,
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      <button
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => applyDelta(step)}
        className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-base font-bold transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        +
      </button>
    </div>
  )
}

// ─── SetInput ────────────────────────────────────────────────────────────────

interface Props {
  exerciseSets: ExerciseSets[]
  onChange: (updated: ExerciseSets[]) => void
}

export default function SetInput({ exerciseSets, onChange }: Props) {
  const update = (exIdx: number, setIdx: number, field: keyof SetRow, value: number) => {
    onChange(exerciseSets.map((es, ei) =>
      ei !== exIdx ? es : {
        ...es,
        sets: es.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value }),
      }
    ))
  }

  const addSet = (exIdx: number) => {
    onChange(exerciseSets.map((es, ei) =>
      ei !== exIdx ? es : {
        ...es,
        sets: [...es.sets, { ...es.sets[es.sets.length - 1] }],
      }
    ))
  }

  const removeSet = (exIdx: number, setIdx: number) => {
    onChange(exerciseSets.map((es, ei) =>
      ei !== exIdx ? es : {
        ...es,
        sets: es.sets.length === 1 ? es.sets : es.sets.filter((_, si) => si !== setIdx),
      }
    ))
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {exerciseSets.map((es, exIdx) => {
        const type = getExerciseDisplayType(es.exercise.name, es.exercise.muscle_group)
        const isCardio = type === 'cardio'
        const isTimedCore = type === 'timed-core'

        return (
          <div
            key={es.exercise.id}
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {/* Exercise header */}
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-base font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
                {es.exercise.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {es.exercise.muscle_group}
              </span>
            </div>

            {/* Column headers */}
            <div
              className="px-4 py-2"
              style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
            >
              <div className={`grid gap-2 items-center text-xs font-medium ${isTimedCore ? 'grid-cols-[28px_1fr_32px]' : 'grid-cols-[28px_1fr_1fr_32px]'}`}
                style={{ color: 'var(--text-muted)' }}
              >
                <span>Set</span>
                {isCardio && <><span className="text-center">Min</span><span className="text-center">Km</span></>}
                {isTimedCore && <span className="text-center">Seconds</span>}
                {!isCardio && !isTimedCore && <><span className="text-center">Reps</span><span className="text-center">kg</span></>}
                <span />
              </div>
            </div>

            {/* Set rows */}
            <div className="flex flex-col" style={{ background: 'var(--surface)' }}>
              {es.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className={`px-4 py-2.5 grid gap-2 items-center ${isTimedCore ? 'grid-cols-[28px_1fr_32px]' : 'grid-cols-[28px_1fr_1fr_32px]'}`}
                  style={{ borderBottom: setIdx < es.sets.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <span
                    className="text-xs font-semibold tabular-nums w-7 h-7 flex items-center justify-center rounded-md"
                    style={{
                      color: 'var(--accent)',
                      background: 'var(--accent-dim)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {setIdx + 1}
                  </span>

                  {isCardio && <>
                    <EditableStepper value={set.reps} step={1} min={1} integer onChange={(n) => update(exIdx, setIdx, 'reps', n)} />
                    <EditableStepper value={set.weight_kg} step={0.5} min={0} onChange={(n) => update(exIdx, setIdx, 'weight_kg', n)} />
                  </>}
                  {isTimedCore && (
                    <EditableStepper value={set.reps} step={5} min={5} integer onChange={(n) => update(exIdx, setIdx, 'reps', n)} />
                  )}
                  {!isCardio && !isTimedCore && <>
                    <EditableStepper value={set.reps} step={1} min={1} integer onChange={(n) => update(exIdx, setIdx, 'reps', n)} />
                    <EditableStepper value={set.weight_kg} step={2.5} min={0} onChange={(n) => update(exIdx, setIdx, 'weight_kg', n)} />
                  </>}

                  <button
                    onClick={() => removeSet(exIdx, setIdx)}
                    disabled={es.sets.length === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg"
                    style={{ opacity: es.sets.length === 1 ? 0.25 : 1 }}
                  >
                    <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              ))}

              {/* Add set */}
              <button
                onClick={() => addSet(exIdx)}
                className="flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors w-full"
                style={{
                  color: 'var(--accent)',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <Plus size={13} />
                {isCardio ? 'Add interval' : 'Add set'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
