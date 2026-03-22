'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2, Trophy, LayoutTemplate } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Exercise } from '@/lib/types'
import ExercisePicker from '@/components/ExercisePicker'
import SetInput, { ExerciseSets, defaultRow } from '@/components/SetInput'
import TemplatePicker from '@/components/TemplatePicker'
import UsernameModal from '@/components/UsernameModal'
import { getExerciseDisplayType, ExerciseDisplayType } from '@/lib/utils'

type Step = 'pick' | 'sets' | 'finish' | 'share' | 'success'

interface NewPR {
  exercise_name: string
  weight_kg: number
  reps: number
}

const STEP_LABELS: Record<Exclude<Step, 'success' | 'share'>, string> = {
  pick: 'Choose exercises',
  sets: 'Log sets',
  finish: 'Finish',
}

// ── PR share screen ──────────────────────────────────────────────────────────

function PRShareCard({
  pr,
  userId,
  username,
  onNeedUsername,
}: {
  pr: NewPR
  userId: string
  username: string | null | undefined
  onNeedUsername: (onDone: () => void) => void
}) {
  const [posted, setPosted] = useState(false)
  const [posting, setPosting] = useState(false)

  const post = async () => {
    if (!username) {
      onNeedUsername(() => post())
      return
    }
    setPosting(true)
    try {
      const { error } = await createClient().from('posts').insert({
        user_id: userId,
        type: 'pr',
        exercise_name: pr.exercise_name,
        weight_kg: pr.weight_kg,
        reps: pr.reps,
      })
      if (error) console.error('[PRShareCard] post insert:', error.message)
      else setPosted(true)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div
      className="p-4 rounded-xl flex items-center justify-between gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Trophy size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>New PR</span>
        </div>
        <p className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {pr.exercise_name}
        </p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {pr.weight_kg} kg{pr.reps > 0 ? ` × ${pr.reps} reps` : ''}
        </p>
      </div>
      <button
        onClick={post}
        disabled={posted || posting}
        className="px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 transition-opacity"
        style={{
          background: posted ? 'transparent' : 'var(--accent)',
          color: posted ? 'var(--success)' : '#fff',
          border: posted ? '1px solid var(--success)' : 'none',
          opacity: posting ? 0.5 : 1,
        }}
      >
        {posted ? 'Posted ✓' : posting ? '…' : 'Post to feed'}
      </button>
    </div>
  )
}

function PRShareScreen({
  prs,
  userId,
  username,
  onDone,
}: {
  prs: NewPR[]
  userId: string
  username: string | null | undefined
  onDone: () => void
}) {
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)
  const [currentUsername, setCurrentUsername] = useState(username)

  const handleNeedUsername = (onDone: () => void) => {
    setPendingCallback(() => onDone)
    setShowUsernameModal(true)
  }

  return (
    <main
      className="min-h-screen flex flex-col px-4 pb-10"
      style={{ background: 'var(--bg)' }}
    >
      <div className="flex flex-col items-center gap-2 pt-20 mb-8 text-center">
        <CheckCircle2 size={44} style={{ color: 'var(--success)' }} />
        <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
          Workout saved!
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          You hit {prs.length} new PR{prs.length > 1 ? 's' : ''} 🏆 — share to your feed?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {prs.map((pr) => (
          <PRShareCard
            key={pr.exercise_name}
            pr={pr}
            userId={userId}
            username={currentUsername}
            onNeedUsername={handleNeedUsername}
          />
        ))}
      </div>

      <button
        onClick={onDone}
        className="w-full py-3 rounded-[10px] text-sm font-semibold"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        Done
      </button>

      {showUsernameModal && (
        <UsernameModal
          userId={userId}
          onSaved={async () => {
            // Re-fetch username from profiles
            const { data } = await createClient()
              .from('profiles')
              .select('username')
              .eq('id', userId)
              .single()
            const saved = data?.username ?? null
            setCurrentUsername(saved)
            setShowUsernameModal(false)
            if (pendingCallback) {
              pendingCallback()
              setPendingCallback(null)
            }
          }}
          onClose={() => { setShowUsernameModal(false); setPendingCallback(null) }}
        />
      )}
    </main>
  )
}

const STEPS: Exclude<Step, 'success'>[] = ['pick', 'sets', 'finish']

export default function LogPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('pick')
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([])
  const [exerciseSets, setExerciseSets] = useState<ExerciseSets[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPRs, setNewPRs] = useState<NewPR[]>([])
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  const unit = profile?.unit_preference ?? 'kg'

  const goToSets = () => {
    const updated = selectedExercises.map((ex) => {
      const existing = exerciseSets.find((es) => es.exercise.name === ex.name)
      return existing ?? { exercise: ex, sets: [defaultRow(getExerciseDisplayType(ex.name, ex.muscle_group))] }
    })
    setExerciseSets(updated)
    setStep('sets')
  }

  const handleTemplateUse = (exercises: Exercise[], sets: ExerciseSets[]) => {
    setSelectedExercises(exercises)
    setExerciseSets(sets)
    setShowTemplatePicker(false)
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
          exercise_id: es.exercise.is_custom ? null : (es.exercise.id as number),
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

      // Auto-detect PRs: for each strength exercise, upsert if new max weight
      const prUpserts = exerciseSets
        .filter((es) => {
          const type: ExerciseDisplayType = getExerciseDisplayType(es.exercise.name, es.exercise.muscle_group)
          return type === 'normal'
        })
        .flatMap((es) => {
          const best = es.sets.reduce(
            (max, s) => (s.weight_kg > max.weight_kg ? s : max),
            es.sets[0]
          )
          if (!best || best.weight_kg <= 0) return []
          return [{
            user_id: user.id,
            exercise_name: es.exercise.name,
            weight_kg: best.weight_kg,
            reps: best.reps,
            achieved_at: new Date().toISOString(),
          }]
        })

      const achievedPRs: NewPR[] = []

      if (prUpserts.length > 0) {
        for (const pr of prUpserts) {
          const { data: existing } = await supabase
            .from('personal_records')
            .select('weight_kg')
            .eq('user_id', pr.user_id)
            .eq('exercise_name', pr.exercise_name)
            .maybeSingle()

          if (!existing || Number(pr.weight_kg) > Number(existing.weight_kg)) {
            const { error: prError } = await supabase
              .from('personal_records')
              .upsert(pr, { onConflict: 'user_id,exercise_name' })
            if (prError) console.error('[LogPage] PR upsert:', prError.message)
            else achievedPRs.push({ exercise_name: pr.exercise_name, weight_kg: pr.weight_kg, reps: pr.reps })
          }
        }
      }

      if (achievedPRs.length > 0) {
        setNewPRs(achievedPRs)
        setStep('share')
      } else {
        setStep('success')
        setTimeout(() => router.push('/history'), 1500)
      }
    } catch (err) {
      console.error('[LogPage] saveWorkout threw:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      clearTimeout(giveUp)
      setSaving(false)
    }
  }

  const saveCurrentAsTemplate = async () => {
    if (!user || exerciseSets.length === 0 || !templateName.trim()) return

    setSavingTemplate(true)
    setTemplateError(null)

    try {
      const { data: tmpl, error: tmplErr } = await supabase
        .from('workout_templates')
        .insert({ user_id: user.id, name: templateName.trim() })
        .select('id')
        .single()

      if (tmplErr || !tmpl) {
        console.error('[LogPage] template insert:', tmplErr?.message)
        setTemplateError('Could not save template')
        return
      }

      let order = 0
      const rows = exerciseSets.flatMap((es) =>
        es.sets.map((s) => ({
          template_id: tmpl.id,
          exercise_id: es.exercise.is_custom ? null : (es.exercise.id as number),
          exercise_name: es.exercise.name,
          sets: 1,
          reps: s.reps,
          weight_kg: s.weight_kg,
          sort_order: order++,
        }))
      )

      if (rows.length > 0) {
        const { error: exErr } = await supabase.from('workout_template_exercises').insert(rows)
        if (exErr) {
          console.error('[LogPage] template exercises insert:', exErr.message)
          setTemplateError('Could not save template')
          return
        }
      }

      setTemplateSaved(true)
      setShowTemplateNameInput(false)
      setTemplateName('')
      setTimeout(() => setTemplateSaved(false), 2000)
    } catch (err) {
      console.error('[LogPage] saveCurrentAsTemplate threw:', err)
      setTemplateError('Could not save template')
    } finally {
      setSavingTemplate(false)
    }
  }

  if (step === 'share') {
    return <PRShareScreen prs={newPRs} userId={user!.id} username={profile?.username ?? null} onDone={() => { setStep('success'); setTimeout(() => router.push('/history'), 1200) }} />
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

  const currentStepIdx = STEPS.indexOf(step as Exclude<Step, 'success' | 'share'>)

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
            {STEP_LABELS[step as Exclude<Step, 'success' | 'share'>]}
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
          <div className="flex flex-col">
            {/* Use template button */}
            {user && (
              <div className="px-4 pt-3 pb-1">
                <button
                  onClick={() => setShowTemplatePicker(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <LayoutTemplate size={13} style={{ color: 'var(--accent)' }} />
                  Use Template
                </button>
              </div>
            )}
            <ExercisePicker
              selected={selectedExercises}
              onSelectionChange={setSelectedExercises}
              onNext={goToSets}
              userId={user?.id}
            />
          </div>
        )}

        {step === 'sets' && (
          <div className="pt-4">
            <SetInput exerciseSets={exerciseSets} onChange={setExerciseSets} unit={unit} />
            <div className="px-4 pt-2">
              {user && (
                <div className="mb-3">
                  {templateSaved ? (
                    <p className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                      Template saved ✓
                    </p>
                  ) : showTemplateNameInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          minWidth: 0,
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCurrentAsTemplate()
                        }}
                      />
                      <button
                        onClick={() => {
                          setShowTemplateNameInput(false)
                          setTemplateName('')
                          setTemplateError(null)
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCurrentAsTemplate}
                        disabled={!templateName.trim() || savingTemplate}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
                        style={{ background: 'var(--accent)', opacity: !templateName.trim() || savingTemplate ? 0.5 : 1 }}
                      >
                        {savingTemplate ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowTemplateNameInput(true)
                        setTemplateError(null)
                      }}
                      className="w-full py-2.5 rounded-[10px] font-semibold text-sm"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Create Template
                    </button>
                  )}
                  {templateError && (
                    <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>
                      {templateError}
                    </p>
                  )}
                </div>
              )}
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
                    key={es.exercise.name}
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

      {showTemplatePicker && user && (
        <TemplatePicker
          userId={user.id}
          onUse={handleTemplateUse}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </main>
  )
}
