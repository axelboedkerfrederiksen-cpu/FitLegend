'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { FeedPost } from '@/lib/types'

export function useFeedPosts(userId: string | null) {
  const [friendPosts, setFriendPosts] = useState<FeedPost[]>([])
  const [ownPosts, setOwnPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: follows, error: followsError } = await withTimeout(
        supabase.from('follows').select('following_id').eq('follower_id', userId)
      )
      if (followsError) console.error('[useFeedPosts] follows:', followsError.message)

      const followingIds = (follows ?? []).map((f: { following_id: string }) => f.following_id)

      const [friendRes, ownRes] = await Promise.allSettled([
        followingIds.length > 0
          ? withTimeout(
              supabase
                .from('posts')
                .select('*, profiles(*)')
                .in('user_id', followingIds)
                .order('created_at', { ascending: false })
                .limit(50)
            )
          : Promise.resolve({ data: [], error: null }),
        withTimeout(
          supabase
            .from('posts')
            .select('*, profiles(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)
        ),
      ])

      if (friendRes.status === 'fulfilled' && !friendRes.value.error) {
        setFriendPosts((friendRes.value.data as FeedPost[]) ?? [])
      }
      if (ownRes.status === 'fulfilled' && !ownRes.value.error) {
        setOwnPosts((ownRes.value.data as FeedPost[]) ?? [])
      }
    } catch (err) {
      console.error('[useFeedPosts] threw:', err)
    } finally {
      setLoading(false)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { friendPosts, ownPosts, loading, refetch: fetchPosts }
}
