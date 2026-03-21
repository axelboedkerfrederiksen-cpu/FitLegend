'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Exercise } from '@/lib/types'
import ExercisePicker from '@/components/ExercisePicker'
import SetInput, { ExerciseSets, defaultRow } from '@/components/SetInput'
import { getExerciseDisplayType } from '@/lib/utils'

type Step = 'pick' | 'sets' | 'finish' | 'success'

const STEP_LABELS: Record<Exclude<Step, 'success'>, string> = {
  pick: 'Choose exercises',
  sets: 'Log sets',
  finish: 'Finish',
}

const STEPS: Exclude<Step, 'success'>[] = ['pick', 'sets', 'finish']

export default function LogPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('pick')
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([])
  const [exerciseSets, setExerciseSets] = useState<ExerciseSets[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goToSets = () => {
    const updated = selectedExercises.map((ex) => {
      const existing = exerciseSets.find((es) => es.exercise.id === ex.id)
      return existing ?? { exercise: ex, sets: [defaultRow(getExerciseDisplayType(ex.name, ex.muscle_group))] }
    })
    setExerciseSets(updated)
    setStep('sets')
  }

  const saveWorkout = async () => {
    if (!user) {
      setError('Not signed in. Please reload and try again.')
      return
    }
    setSaving(true)
    setError(null)

    // Safety net — if Supabase hangs, unblock the UI after 12s
    const giveUp = setTimeout(() => {
      setSaving(false)
      setError('Request timed out. Check your connection and try again.')
    }, 12000)

    try {
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({ user_id: user.id, notes: notes.trim() || null })
        .select('id')
        .single()

      if (workoutError || !workout) {
        console.error('[LogPage] workout insert:', workoutError?.message, workoutError?.code)
        setError(`Failed to save: ${workoutError?.message ?? 'unknown error'}`)
        return
      }

      const setRows = exerciseSets.flatMap((es) =>
        es.sets.map((s) => ({
          workout_id: workout.id,
          exercise_id: es.exercise.id,
          exercise_name: es.exercise.name,
          sets: 1,
          reps: s.reps,
          weight_kg: s.weight_kg,
        }))
      )

      if (setRows.length > 0) {
        const { error: setsError } = await supabase.from('workout_sets').insert(setRows)
        if (setsError) {
          console.error('[LogPage] sets insert:', setsError.message, setsError.code)
          // Workout row exists — don't block, still proceed to success
        }
      }

      setStep('success')
      setTimeout(() => router.push('/history'), 1500)
    } catch (err) {
      console.error('[LogPage] saveWorkout threw:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      clearTimeout(giveUp)
      setSaving(false)
    }
  }

  if (step === 'success') {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ background: 'var(--bg)' }}
      >
        <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Workout saved
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Redirecting to history…
        </p>
      </main>
    )
  }

  const currentStepIdx = STEPS.indexOf(step as Exclude<Step, 'success'>)

  return (
    <main className="min-h-screen flex flex-col pb-20" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {step !== 'pick' && (
          <button
            onClick={() => setStep(step === 'sets' ? 'pick' : 'sets')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}

        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {STEP_LABELS[step as Exclude<Step, 'success'>]}
          </h1>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="rounded-full transition-all"
              style={{
                width: i === currentStepIdx ? 20 : 6,
                height: 6,
                background: i === currentStepIdx
                  ? 'var(--accent)'
                  : i < currentStepIdx
                  ? 'var(--accent)'
                  : 'var(--border)',
                opacity: i < currentStepIdx ? 0.4 : 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'pick' && (
          <ExercisePicker
            selected={selectedExercises}
            onSelectionChange={setSelectedExercises}
            onNext={goToSets}
          />
        )}

        {step === 'sets' && (
          <div className="pt-4">
            <SetInput exerciseSets={exerciseSets} onChange={setExerciseSets} />
            <div className="px-4 pt-2">
              <button
                onClick={() => setStep('finish')}
                className="w-full py-3 rounded-[10px] font-semibold text-sm text-white"
                style={{ background: 'var(--accent)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 'finish' && (
          <div className="px-4 pt-5 flex flex-col gap-5">
            {/* Summary */}
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                Workout summary
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                {exerciseSets.map((es, i) => (
                  <div
                    key={es.exercise.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      background: 'var(--surface)',
                      borderBottom: i < exerciseSets.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {es.exercise.name}
                    </span>
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {es.sets.length} set{es.sets.length > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it go?"
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 text-sm resize-none outline-none transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              onClick={saveWorkout}
              disabled={saving}
              className="w-full py-3 rounded-[10px] font-semibold text-sm text-white transition-opacity"
              style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Complete Workout'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
