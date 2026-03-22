'use client'

import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { FeedPost } from '@/lib/types'
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

export default function PostCard({ post }: { post: FeedPost }) {
  const profile = post.profiles
  const displayName = profile?.display_name ?? profile?.username ?? 'Unknown'

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

      {/* PR content */}
      <div className="px-4 py-4">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
          style={{ background: 'var(--accent-dim)' }}
        >
          <Trophy size={12} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            New Personal Record
          </span>
        </div>

        <p className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {post.exercise_name}
        </p>
        <p className="text-3xl font-bold" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
          {post.weight_kg} <span className="text-lg font-semibold">kg</span>
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
      </div>
    </div>
  )
}
