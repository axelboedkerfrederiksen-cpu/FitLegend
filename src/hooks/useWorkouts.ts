'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { WorkoutWithSets, FeedWorkout } from '@/lib/types'

export function useWorkouts(userId: string | null) {
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const supabase = createClient()

  const fetchWorkouts = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('workouts')
          .select('*, workout_sets(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      )
      if (error) console.error('[useWorkouts]', error.message)
      setWorkouts((data as WorkoutWithSets[]) ?? [])
    } catch (err) {
      console.error('[useWorkouts] threw:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  return { workouts, loading, error, refetch: fetchWorkouts }
}

export function useFeedWorkouts(userId: string | null) {
  const [feed, setFeed] = useState<FeedWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFeed = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: follows, error: followsError } = await withTimeout(
        supabase.from('follows').select('following_id').eq('follower_id', userId)
      )

      if (followsError) console.error('[useFeedWorkouts] follows:', followsError.message)

      if (!follows || follows.length === 0) {
        setFeed([])
        setLoading(false)
        return
      }

      const followingIds = follows.map((f: { following_id: string }) => f.following_id)

      const { data, error } = await withTimeout(
        supabase
          .from('workouts')
          .select('*, workout_sets(*), profiles(*)')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(50)
      )

      if (error) console.error('[useFeedWorkouts] feed:', error.message)
      setFeed((data as FeedWorkout[]) ?? [])
    } catch (err) {
      console.error('[useFeedWorkouts] threw:', err)
    } finally {
      setLoading(false)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workouts' },
        async (payload) => {
          const newWorkoutUserId = (payload.new as { user_id: string }).user_id

          const { data: followCheck } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId)
            .eq('following_id', newWorkoutUserId)
            .single()

          if (!followCheck) return

          const { data } = await supabase
            .from('workouts')
            .select('*, workout_sets(*), profiles(*)')
            .eq('id', (payload.new as { id: string }).id)
            .single()

          if (data) {
            setFeed((prev) => [data as FeedWorkout, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { feed, loading, refetch: fetchFeed }
}
