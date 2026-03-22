'use client'

import { useEffect, useState } from 'react'
import { X, LayoutTemplate } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { Exercise } from '@/lib/types'
import { ExerciseSets, defaultRow } from '@/components/SetInput'
import { getExerciseDisplayType } from '@/lib/utils'

interface Template {
  id: string
  name: string
  created_at: string
}

interface TemplateExercise {
  exercise_id: number | null
  exercise_name: string
  sets: number
  reps: number
  weight_kg: number
  sort_order: number
}

interface Props {
  userId: string
  onUse: (exercises: Exercise[], sets: ExerciseSets[]) => void
  onClose: () => void
}

export default function TemplatePicker({ userId, onUse, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await withTimeout(
          createClient()
            .from('workout_templates')
            .select('id, name, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        )
        if (!error) setTemplates((data as Template[]) ?? [])
      } catch (err) {
        console.error('[TemplatePicker] load:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const applyTemplate = async (template: Template) => {
    setApplying(template.id)
    try {
      const sb = createClient()
      const { data: templateExercises, error } = await withTimeout(
        sb
          .from('workout_template_exercises')
          .select('*')
          .eq('template_id', template.id)
          .order('sort_order')
      )
      if (error || !templateExercises) return

      const rows = templateExercises as TemplateExercise[]

      // Group by exercise_name
      const grouped = new Map<string, TemplateExercise[]>()
      for (const r of rows) {
        if (!grouped.has(r.exercise_name)) grouped.set(r.exercise_name, [])
        grouped.get(r.exercise_name)!.push(r)
      }

      // Fetch exercise objects for known exercises
      const exerciseNames = [...grouped.keys()]
      const { data: exerciseData } = await withTimeout(
        sb.from('exercises').select('*').in('name', exerciseNames)
      )
      const exerciseMap = new Map<string, Exercise>(
        ((exerciseData as Exercise[]) ?? []).map((e) => [e.name, e])
      )

      const exercises: Exercise[] = []
      const sets: ExerciseSets[] = []

      for (const [name, exRows] of grouped.entries()) {
        const ex: Exercise = exerciseMap.get(name) ?? {
          id: exRows[0].exercise_id ?? -(Math.abs(name.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)) + 1),
          name,
          muscle_group: 'Push',
          icon: '',
          is_custom: !exerciseMap.has(name),
        }
        exercises.push(ex)
        const type = getExerciseDisplayType(ex.name, ex.muscle_group)
        sets.push({
          exercise: ex,
          sets: exRows.map((r) => ({ reps: r.reps, weight_kg: r.weight_kg })).length > 0
            ? exRows.map((r) => ({ reps: r.reps, weight_kg: r.weight_kg }))
            : [defaultRow(type)],
        })
      }

      onUse(exercises, sets)
    } catch (err) {
      console.error('[TemplatePicker] apply:', err)
    } finally {
      setApplying(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl pb-8"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <LayoutTemplate size={16} style={{ color: 'var(--accent)' }} />
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Workout Templates</p>
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="px-4 pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <LayoutTemplate size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No templates yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Save a workout as a template from your history to reuse it here
              </p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {templates.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  disabled={applying === t.id}
                  className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors"
                  style={{
                    background: 'var(--surface)',
                    borderBottom: i < templates.length - 1 ? '1px solid var(--border)' : 'none',
                    opacity: applying === t.id ? 0.6 : 1,
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: applying === t.id ? 'var(--text-muted)' : 'var(--accent)' }}>
                    {applying === t.id ? 'Loading…' : 'Use'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
