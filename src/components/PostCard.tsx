'use client'

import { useEffect, useState } from 'react'
import { useRef } from 'react'
import Link from 'next/link'
import { Trophy, Dumbbell, Heart, Trash2, MoreHorizontal, Pencil } from 'lucide-react'
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
  onDelete?: (postId: string) => Promise<void> | void
}

export default function PostCard({ post, currentUserId, unit = 'kg', onDelete }: Props) {
  const [editablePost, setEditablePost] = useState(post)
  const profile = editablePost.profiles
  const displayName = profile?.display_name ?? profile?.username ?? 'Unknown'
  const isPR = editablePost.type === 'pr'
  const isOwnPost = !!currentUserId && editablePost.user_id === currentUserId

  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setEditablePost(post)
  }, [post])

  useEffect(() => {
    const load = async () => {
      const sb = createClient()
      const { data, error } = await sb
        .from('post_likes')
        .select('user_id')
        .eq('post_id', editablePost.id)
      if (error || !data) return
      setLikeCount(data.length)
      if (currentUserId) {
        setIsLiked(data.some((r: { user_id: string }) => r.user_id === currentUserId))
      }
    }
    load()
  }, [editablePost.id, currentUserId])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', onDocClick)
    }

    return () => {
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [menuOpen])

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
          .eq('post_id', editablePost.id)
          .eq('user_id', currentUserId)
        if (error) throw error
      } else {
        const { error } = await sb
          .from('post_likes')
          .upsert({ post_id: editablePost.id, user_id: currentUserId }, { onConflict: 'post_id,user_id' })
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

  const handleDelete = async () => {
    if (!isOwnPost || !onDelete || deleteLoading) return
    const confirmed = window.confirm('Delete this post? This cannot be undone.')
    if (!confirmed) return

    setMenuOpen(false)
    setDeleteLoading(true)
    try {
      await onDelete(editablePost.id)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!isOwnPost || !currentUserId || editLoading) return

    const nextExercise = window.prompt('Exercise name', editablePost.exercise_name)
    if (nextExercise === null) return
    const exerciseName = nextExercise.trim()
    if (!exerciseName) return

    const nextWeightInput = window.prompt('Weight in kg', String(editablePost.weight_kg))
    if (nextWeightInput === null) return
    const weightKg = Number(nextWeightInput)
    if (!Number.isFinite(weightKg) || weightKg < 0) return

    const nextRepsInput = window.prompt('Reps', String(editablePost.reps))
    if (nextRepsInput === null) return
    const reps = Number(nextRepsInput)
    if (!Number.isFinite(reps) || reps < 0) return

    const nextCaptionInput = window.prompt('Caption (optional)', editablePost.caption ?? '')
    if (nextCaptionInput === null) return
    const caption = nextCaptionInput.trim() || null

    setEditLoading(true)
    setMenuOpen(false)
    try {
      const sb = createClient()
      const { error } = await sb
        .from('posts')
        .update({
          exercise_name: exerciseName,
          weight_kg: weightKg,
          reps,
          caption,
        })
        .eq('id', editablePost.id)
        .eq('user_id', currentUserId)

      if (error) {
        console.error('[PostCard] edit post:', error.message)
        return
      }

      setEditablePost((prev) => ({
        ...prev,
        exercise_name: exerciseName,
        weight_kg: weightKg,
        reps,
        caption,
      }))
    } finally {
      setEditLoading(false)
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
            {timeAgo(editablePost.created_at)}
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
          {editablePost.exercise_name}
        </p>
        <p className="text-3xl font-bold" style={{ color: isPR ? 'var(--accent)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtWeight(editablePost.weight_kg, unit)}
          {editablePost.reps > 0 && (
            <span className="text-base font-medium ml-2" style={{ color: 'var(--text-muted)' }}>
              × {editablePost.reps} reps
            </span>
          )}
        </p>

        {editablePost.caption && (
          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
            {editablePost.caption}
          </p>
        )}

        {/* Like button */}
        <div className="flex items-center justify-between gap-2 mt-4">
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

          {isOwnPost && onDelete && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                disabled={deleteLoading || editLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                aria-label="Post actions"
              >
                <MoreHorizontal size={16} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 bottom-10 min-w-[140px] rounded-lg overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', zIndex: 20 }}
                >
                  <button
                    onClick={handleEdit}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2"
                    style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
