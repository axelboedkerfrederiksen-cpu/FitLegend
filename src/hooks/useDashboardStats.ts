'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getExerciseDisplayType, withTimeout } from '@/lib/utils'
import { WorkoutWithSets } from '@/lib/types'

export interface DashboardStats {
  totalWorkouts: number | null
  streak: number | null
  weeklyVolume: number | null
  latestPR: { exercise: string; weight: number } | null
  recentWorkouts: WorkoutWithSets[]
}

const EMPTY_STATS: DashboardStats = {
  totalWorkouts: null,
  streak: null,
  weeklyVolume: null,
  latestPR: null,
  recentWorkouts: [],
}

function computeStreak(createdAts: string[]): number {
  if (!createdAts.length) return 0

  const uniqueDates = [...new Set(createdAts.map((d) => d.slice(0, 10)))]
    .sort()
    .reverse()

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

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
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function useDashboardStats(userId: string | null) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    const supabase = createClient()

    const [countRes, datesRes, weekRes, prRes, recentRes] = await Promise.allSettled([
      withTimeout(
        supabase
          .from('workouts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ),
      withTimeout(
        supabase
          .from('workouts')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ),
      withTimeout(
        supabase
          .from('workouts')
          .select('id, workout_sets(exercise_name, sets, reps, weight_kg)')
          .eq('user_id', userId)
          .gte('created_at', startOfWeek())
      ),
      withTimeout(
        supabase
          .from('workout_sets')
          .select('exercise_name, weight_kg')
          .gt('weight_kg', 0)
          .order('weight_kg', { ascending: false })
          .limit(1)
          .maybeSingle()
      ),
      withTimeout(
        supabase
          .from('workouts')
          .select('*, workout_sets(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
      ),
    ])

    // If all failed, set error state
    const allFailed = [countRes, datesRes, weekRes, prRes, recentRes].every(
      (r) => r.status === 'rejected'
    )
    if (allFailed) {
      setError(true)
      setLoading(false)
      return
    }

    // Extract values safely
    const count =
      countRes.status === 'fulfilled' && !countRes.value.error
        ? (countRes.value.count ?? null)
        : null

    const dates =
      datesRes.status === 'fulfilled' && !datesRes.value.error
        ? (datesRes.value.data ?? []).map((r) => r.created_at)
        : []

    const weekData =
      weekRes.status === 'fulfilled' && !weekRes.value.error
        ? (weekRes.value.data ?? [])
        : []

    const prData =
      prRes.status === 'fulfilled' && !prRes.value.error
        ? prRes.value.data
        : null

    const recentData =
      recentRes.status === 'fulfilled' && !recentRes.value.error
        ? (recentRes.value.data as WorkoutWithSets[]) ?? []
        : []

    const streak = computeStreak(dates)

    const weeklyVolume = weekData.reduce((sum, workout) => {
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
      totalWorkouts: count,
      streak,
      weeklyVolume,
      latestPR: prData
        ? { exercise: prData.exercise_name, weight: prData.weight_kg }
        : null,
      recentWorkouts: recentData,
    })
    setLoading(false)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  return { stats, loading, error, refetch: load }
}
