'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Settings, ChevronLeft, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { Profile, FeedPost } from '@/lib/types'
import UserAvatar from '@/components/UserAvatar'
import PostCard from '@/components/PostCard'
import ShareLiftModal from '@/components/ShareLiftModal'

interface ProfileStats {
  workoutCount: number
  followerCount: number
  followingCount: number
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const isOwn = user?.id === id

  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<ProfileStats>({ workoutCount: 0, followerCount: 0, followingCount: 0 })
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentUsername, setCurrentUsername] = useState<string | null | undefined>(null)

  // Keep username in sync once profile loads
  useEffect(() => {
    if (profile && isOwn) setCurrentUsername(profile.username ?? null)
  }, [profile, isOwn])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const sb = createClient()
      const [profileRes, workoutCountRes, followerRes, followingRes, postsRes, followCheckRes] =
        await Promise.allSettled([
          withTimeout(sb.from('profiles').select('*').eq('id', id).single()),
          withTimeout(sb.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', id)),
          withTimeout(sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id)),
          withTimeout(sb.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', id)),
          withTimeout(
            sb.from('posts')
              .select('*, profiles(*)')
              .eq('user_id', id)
              .order('created_at', { ascending: false })
              .limit(50)
          ),
          user && !isOwn
            ? withTimeout(
                sb.from('follows')
                  .select('following_id')
                  .eq('follower_id', user.id)
                  .eq('following_id', id)
                  .maybeSingle()
              )
            : Promise.resolve({ data: null, error: null }),
        ])

      if (profileRes.status === 'fulfilled' && !profileRes.value.error) {
        setProfile(profileRes.value.data as Profile)
      }
      setStats({
        workoutCount: workoutCountRes.status === 'fulfilled' ? (workoutCountRes.value.count ?? 0) : 0,
        followerCount: followerRes.status === 'fulfilled' ? (followerRes.value.count ?? 0) : 0,
        followingCount: followingRes.status === 'fulfilled' ? (followingRes.value.count ?? 0) : 0,
      })
      if (postsRes.status === 'fulfilled' && !postsRes.value.error) {
        setPosts((postsRes.value.data as FeedPost[]) ?? [])
      }
      if (followCheckRes.status === 'fulfilled') {
        setIsFollowing(!!(followCheckRes.value as { data: unknown }).data)
      }
    } finally {
      setLoading(false)
    }
  }, [id, user, isOwn])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  const toggleFollow = async () => {
    if (!user || isOwn) return
    setFollowLoading(true)
    const sb = createClient()
    try {
      if (isFollowing) {
        await sb.from('follows').delete().eq('follower_id', user.id).eq('following_id', id)
        setIsFollowing(false)
        setStats((s) => ({ ...s, followerCount: s.followerCount - 1 }))
      } else {
        await sb.from('follows').insert({ follower_id: user.id, following_id: id })
        setIsFollowing(true)
        setStats((s) => ({ ...s, followerCount: s.followerCount + 1 }))
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user || !isOwn) return
    const sb = createClient()
    const { error } = await sb
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[ProfilePage] delete post:', error.message)
      return
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full animate-pulse" style={{ background: 'var(--surface)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
              <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'var(--surface)' }} />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen pb-20 px-4 pt-12" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>User not found.</p>
      </main>
    )
  }

  const displayName = profile.display_name ?? profile.username ?? 'Unknown'

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        {!isOwn ? (
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        ) : (
          <div />
        )}
        {isOwn && (
          <Link href="/settings">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
          </Link>
        )}
      </div>

      {/* Avatar + name */}
      <div className="px-4 pb-5">
        <div className="flex items-center gap-4 mb-4">
          <UserAvatar avatarUrl={profile.avatar_url} displayName={displayName} size={64} />
          <div>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
            {profile.username && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>@{profile.username}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 rounded-xl overflow-hidden mb-4"
          style={{ border: '1px solid var(--border)' }}
        >
          {[
            { label: 'Workouts', value: stats.workoutCount },
            { label: 'Followers', value: stats.followerCount },
            { label: 'Following', value: stats.followingCount },
          ].map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center py-3"
              style={{
                background: 'var(--surface)',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              }}
            >
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Follow / Edit button */}
        {!isOwn ? (
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className="w-full py-2.5 rounded-[10px] text-sm font-semibold transition-opacity"
            style={{
              background: isFollowing ? 'var(--surface)' : 'var(--accent)',
              color: isFollowing ? 'var(--text-primary)' : '#fff',
              border: isFollowing ? '1px solid var(--border)' : 'none',
              opacity: followLoading ? 0.5 : 1,
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : (
          <div className="flex gap-2">
            <Link href="/settings" className="flex-1">
              <div
                className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-center"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                Edit Profile
              </div>
            </Link>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-sm font-semibold"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="px-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
          {isOwn ? 'Your posts' : 'Posts'}
        </p>
        {posts.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isOwn ? 'No posts yet. Share a lift from the Progress tab or History.' : 'No posts yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onDelete={isOwn ? handleDeletePost : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {showShareModal && user && isOwn && (
        <ShareLiftModal
          userId={user.id}
          username={currentUsername}
          onClose={() => setShowShareModal(false)}
          onUsernameSet={(u) => setCurrentUsername(u)}
        />
      )}
    </main>
  )
}
