'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { FeedPost } from '@/lib/types'

export function useFeedPosts(userId: string | null) {
  const [posts, setPosts] = useState<FeedPost[]>([])
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

      if (!follows || follows.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      const followingIds = follows.map((f: { following_id: string }) => f.following_id)

      const { data, error } = await withTimeout(
        supabase
          .from('posts')
          .select('*, profiles(*)')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(50)
      )
      if (error) console.error('[useFeedPosts] posts:', error.message)
      setPosts((data as FeedPost[]) ?? [])
    } catch (err) {
      console.error('[useFeedPosts] threw:', err)
    } finally {
      setLoading(false)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { posts, loading, refetch: fetchPosts }
}
