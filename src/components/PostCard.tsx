'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Dumbbell, Heart } from 'lucide-react'
import { FeedPost } from '@/lib/types'
import { fmtWeight, UnitPref } from '@/lib/units'
import { createClient } from '@/lib/supabase/client'
import UserAvatar from '@/components/UserAvatar'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  post: FeedPost
  currentUserId?: string
  unit?: UnitPref
}

export default function PostCard({ post, currentUserId, unit = 'kg' }: Props) {
  const profile = post.profiles
  const displayName = profile?.display_name ?? profile?.username ?? 'Unknown'
  const isPR = post.type === 'pr'

  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const sb = createClient()
      const { data, error } = await sb
        .from('post_likes')
        .select('user_id')
        .eq('post_id', post.id)
      if (error || !data) return
      setLikeCount(data.length)
      if (currentUserId) {
        setIsLiked(data.some((r: { user_id: string }) => r.user_id === currentUserId))
      }
    }
    load()
  }, [post.id, currentUserId])

  const toggleLike = async () => {
    if (!currentUserId || likeLoading) return
    setLikeLoading(true)
    // Optimistic update
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((c) => c + (wasLiked ? -1 : 1))
    const sb = createClient()
    try {
      if (wasLiked) {
        const { error } = await sb
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId)
        if (error) throw error
      } else {
        const { error } = await sb
          .from('post_likes')
          .upsert({ post_id: post.id, user_id: currentUserId }, { onConflict: 'post_id,user_id' })
        if (error) throw error
      }
    } catch (err) {
      console.error('[PostCard] toggleLike:', err)
      // Revert on error
      setIsLiked(wasLiked)
      setLikeCount((c) => c + (wasLiked ? 1 : -1))
    } finally {
      setLikeLoading(false)
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* User header */}
      <Link href={`/profile/${profile?.id}`}>
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <UserAvatar avatarUrl={profile?.avatar_url ?? null} displayName={displayName} size={34} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </p>
          </div>
          <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(post.created_at)}
          </p>
        </div>
      </Link>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
          style={{ background: isPR ? 'var(--accent-dim)' : 'rgba(139,92,246,0.12)' }}
        >
          {isPR
            ? <Trophy size={12} style={{ color: 'var(--accent)' }} />
            : <Dumbbell size={12} style={{ color: '#8b5cf6' }} />
          }
          <span
            className="text-xs font-semibold"
            style={{ color: isPR ? 'var(--accent)' : '#8b5cf6' }}
          >
            {isPR ? 'New Personal Record' : 'Sharing a lift'}
          </span>
        </div>

        <p className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {post.exercise_name}
        </p>
        <p className="text-3xl font-bold" style={{ color: isPR ? 'var(--accent)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtWeight(post.weight_kg, unit)}
          {post.reps > 0 && (
            <span className="text-base font-medium ml-2" style={{ color: 'var(--text-muted)' }}>
              × {post.reps} reps
            </span>
          )}
        </p>

        {post.caption && (
          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
            {post.caption}
          </p>
        )}

        {/* Like button */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={toggleLike}
            disabled={!currentUserId}
            className="flex items-center gap-1.5 transition-opacity"
            style={{ opacity: likeLoading ? 0.5 : 1 }}
          >
            <Heart
              size={18}
              fill={isLiked ? 'var(--accent)' : 'none'}
              style={{ color: isLiked ? 'var(--accent)' : 'var(--text-muted)' }}
            />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
