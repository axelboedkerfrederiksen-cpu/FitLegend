import { format, formatDistanceToNow, parseISO } from 'date-fns'

// Exercises where reps = duration in seconds, no weight
export const TIMED_CORE_EXERCISES = new Set(['Plank', 'Wall Sit'])

// All cardio exercise names (muscle_group === 'Cardio' in the DB)
export const CARDIO_EXERCISE_NAMES = new Set([
  'Running', 'Cycling', 'Rowing Machine', 'Jump Rope', 'Stair Climber', 'Elliptical', 'Walking',
])

export type ExerciseDisplayType = 'normal' | 'cardio' | 'timed-core'

/** Determine how to display/store a set for a given exercise name. */
export function getExerciseDisplayType(name: string, muscleGroup?: string): ExerciseDisplayType {
  if (muscleGroup === 'Cardio' || CARDIO_EXERCISE_NAMES.has(name)) return 'cardio'
  if (TIMED_CORE_EXERCISES.has(name)) return 'timed-core'
  return 'normal'
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'MMM d, yyyy')
}

export function formatDateShort(dateString: string): string {
  return format(parseISO(dateString), 'MMM d')
}

export function timeAgo(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true })
}

export function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`
  }
  return volume.toString()
}

export function calcVolume(sets: number, reps: number, weight: number): number {
  return sets * reps * weight
}
