'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

export function useProfile(profileId: string | null, currentUserId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async () => {
    if (!profileId) return
    setLoading(true)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()

    setProfile(data)

    if (currentUserId && profileId !== currentUserId) {
      const { data: follow } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profileId)
        .single()

      setIsFollowing(!!follow)
    }

    setLoading(false)
  }, [profileId, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const follow = async () => {
    if (!currentUserId || !profileId) return
    await supabase
      .from('follows')
      .insert({ follower_id: currentUserId, following_id: profileId })
    setIsFollowing(true)
  }

  const unfollow = async () => {
    if (!currentUserId || !profileId) return
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', profileId)
    setIsFollowing(false)
  }

  return { profile, isFollowing, loading, follow, unfollow, refetch: fetchProfile }
}
