'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getExerciseDisplayType } from '@/lib/utils'
import { WorkoutWithSets } from '@/lib/types'

export interface DashboardStats {
  totalWorkouts: number | null
  streak: number | null
  weeklyVolume: number | null
  latestPR: { exercise: string; weight: number } | null
  recentWorkouts: WorkoutWithSets[]
}

function computeStreak(createdAts: string[]): number {
  if (!createdAts.length) return 0

  const uniqueDates = [...new Set(createdAts.map((d) => d.slice(0, 10)))]
    .sort()
    .reverse()

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  // Streak must include today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1])
    const curr = new Date(uniqueDates[i])
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000)
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function startOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay()) // Sunday = start
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function useDashboardStats(userId: string | null) {
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: null,
    streak: null,
    weeklyVolume: null,
    latestPR: null,
    recentWorkouts: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const load = async () => {
      const supabase = createClient()

      try {
        // Run queries in parallel
        const [countRes, datesRes, weekRes, prRes, recentRes] = await Promise.all([
          // 1. Total workout count
          supabase
            .from('workouts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),

          // 2. All workout dates for streak
          supabase
            .from('workouts')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),

          // 3. This week's workouts + sets for volume
          supabase
            .from('workouts')
            .select('id, workout_sets(exercise_name, sets, reps, weight_kg)')
            .eq('user_id', userId)
            .gte('created_at', startOfWeek()),

          // 4. Heaviest lift ever (RLS already scopes to this user)
          supabase
            .from('workout_sets')
            .select('exercise_name, weight_kg')
            .gt('weight_kg', 0)
            .order('weight_kg', { ascending: false })
            .limit(1)
            .maybeSingle(),

          // 5. Recent workouts for the list
          supabase
            .from('workouts')
            .select('*, workout_sets(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5),
        ])

        if (countRes.error) console.error('[Stats] count:', countRes.error.message)
        if (datesRes.error) console.error('[Stats] dates:', datesRes.error.message)
        if (weekRes.error) console.error('[Stats] week:', weekRes.error.message)
        if (prRes.error) console.error('[Stats] pr:', prRes.error.message)
        if (recentRes.error) console.error('[Stats] recent:', recentRes.error.message)

        const streak = computeStreak(
          (datesRes.data ?? []).map((r) => r.created_at)
        )

        const weeklyVolume = (weekRes.data ?? []).reduce((sum, workout) => {
          const sets = (workout.workout_sets ?? []) as Array<{
            exercise_name: string
            sets: number
            reps: number
            weight_kg: number
          }>
          return (
            sum +
            sets.reduce((s, set) => {
              if (getExerciseDisplayType(set.exercise_name) !== 'normal') return s
              return s + set.sets * set.reps * set.weight_kg
            }, 0)
          )
        }, 0)

        setStats({
          totalWorkouts: countRes.count ?? null,
          streak,
          weeklyVolume,
          latestPR: prRes.data
            ? { exercise: prRes.data.exercise_name, weight: prRes.data.weight_kg }
            : null,
          recentWorkouts: (recentRes.data as WorkoutWithSets[]) ?? [],
        })
      } catch (err) {
        console.error('[Stats] load threw:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, loading }
}
