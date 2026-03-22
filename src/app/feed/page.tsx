'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, X, Users, Heart, Inbox } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { useFeedPosts } from '@/hooks/usePosts'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { Profile } from '@/lib/types'
import PostCard from '@/components/PostCard'
import UserAvatar from '@/components/UserAvatar'

interface LikeInboxItem {
  id: string
  created_at: string
  post_id: string
  user_id: string
  exercise_name: string
  liker: Profile | null
}

function SearchResult({
  profile,
  currentUserId,
  onFollowChange,
}: {
  profile: Profile & { is_following: boolean }
  currentUserId: string
  onFollowChange: () => void
}) {
  const [loading, setLoading] = useState(false)
  const displayName = profile.display_name ?? profile.username ?? 'Unknown'

  const toggle = async () => {
    setLoading(true)
    const sb = createClient()
    try {
      if (profile.is_following) {
        await sb.from('follows').delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id)
      } else {
        await sb.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
      }
      onFollowChange()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <UserAvatar avatarUrl={profile.avatar_url} displayName={displayName} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
        {profile.username && (
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{profile.username}</p>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-opacity"
        style={{
          background: profile.is_following ? 'var(--surface)' : 'var(--accent)',
          color: profile.is_following ? 'var(--text-secondary)' : '#fff',
          border: profile.is_following ? '1px solid var(--border)' : 'none',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {profile.is_following ? 'Following' : 'Follow'}
      </button>
    </div>
  )
}

export default function FeedPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { friendPosts, ownPosts, loading: postsLoading, refetch } = useFeedPosts(user?.id ?? null)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<(Profile & { is_following: boolean })[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [inboxLikes, setInboxLikes] = useState<LikeInboxItem[]>([])
  const [inboxLoading, setInboxLoading] = useState(false)

  const fetchInbox = useCallback(async () => {
    if (!user) {
      setInboxLikes([])
      return
    }

    setInboxLoading(true)
    try {
      const sb = createClient()

      const { data: myPosts, error: postsError } = await withTimeout(
        sb
          .from('posts')
          .select('id, exercise_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100)
      )

      if (postsError || !myPosts || myPosts.length === 0) {
        setInboxLikes([])
        return
      }

      const postIds = myPosts.map((p: { id: string }) => p.id)
      const exerciseByPost = new Map(
        myPosts.map((p: { id: string; exercise_name: string }) => [p.id, p.exercise_name])
      )

      const { data: likes, error: likesError } = await withTimeout(
        sb
          .from('post_likes')
          .select('post_id, user_id, created_at')
          .in('post_id', postIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(25)
      )

      if (likesError || !likes || likes.length === 0) {
        setInboxLikes([])
        return
      }

      const likerIds = [...new Set(likes.map((l: { user_id: string }) => l.user_id))]
      const { data: likerProfiles } = await withTimeout(
        sb
          .from('profiles')
          .select('*')
          .in('id', likerIds)
      )

      const profileById = new Map(
        ((likerProfiles as Profile[]) ?? []).map((p) => [p.id, p])
      )

      setInboxLikes(
        likes.map((l: { post_id: string; user_id: string; created_at: string }, idx: number) => ({
          id: `${l.post_id}:${l.user_id}:${idx}`,
          created_at: l.created_at,
          post_id: l.post_id,
          user_id: l.user_id,
          exercise_name: exerciseByPost.get(l.post_id) ?? 'your post',
          liker: profileById.get(l.user_id) ?? null,
        }))
      )
    } catch (err) {
      console.error('[FeedPage] fetchInbox:', err)
      setInboxLikes([])
    } finally {
      setInboxLoading(false)
    }
  }, [user])

  const runSearch = useCallback(async (q: string) => {
    if (!user || !q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const sb = createClient()
      const [profilesRes, followsRes] = await Promise.allSettled([
        withTimeout(
          sb.from('profiles')
            .select('*')
            .neq('id', user.id)
            .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
            .limit(10)
        ),
        withTimeout(
          sb.from('follows').select('following_id').eq('follower_id', user.id)
        ),
      ])

      const profiles = profilesRes.status === 'fulfilled' ? (profilesRes.value.data ?? []) : []
      const followingIds = new Set(
        followsRes.status === 'fulfilled'
          ? (followsRes.value.data ?? []).map((f: { following_id: string }) => f.following_id)
          : []
      )

      setSearchResults(
        (profiles as Profile[]).map((p) => ({ ...p, is_following: followingIds.has(p.id) }))
      )
    } finally {
      setSearching(false)
    }
  }, [user])

  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 300)
    return () => clearTimeout(t)
  }, [search, runSearch])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox, friendPosts])

  const loading = authLoading || postsLoading

  // Show friends' posts if they exist; otherwise fall back to own posts
  const hasFriendPosts = friendPosts.length > 0
  const displayPosts = hasFriendPosts ? friendPosts : ownPosts

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Feed</h1>
        <button
          onClick={() => { setShowSearch((s) => !s); setSearch(''); setSearchResults([]) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: showSearch ? 'var(--accent-dim)' : 'var(--surface)',
            color: showSearch ? 'var(--accent)' : 'var(--text-secondary)',
            border: showSearch ? '1px solid var(--accent-border)' : '1px solid var(--border)',
          }}
        >
          <Search size={13} />
          Find people
        </button>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="px-4 pb-4">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              placeholder="Search by name or username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchResults([]) }}>
                <X size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {search.trim().length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {searching ? (
                <div className="px-4 py-3">
                  <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'var(--border)' }} />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No users found</p>
              ) : (
                searchResults.map((p) => (
                  <SearchResult
                    key={p.id}
                    profile={p}
                    currentUserId={user!.id}
                    onFollowChange={() => { runSearch(search); refetch() }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="px-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : displayPosts.length === 0 ? (
        /* Totally empty — no friends posting AND no own posts */
        <div className="flex flex-col items-center gap-3 pt-20 text-center px-4">
          <Users size={36} style={{ color: 'var(--text-muted)' }} />
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Nothing here yet
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Follow people and their PRs will show up here
          </p>
          <button
            onClick={() => setShowSearch(true)}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Find people to follow
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {/* Inbox */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <Inbox size={14} style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Inbox</p>
            </div>

            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Likes on your posts
              </p>

              {inboxLoading ? (
                <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              ) : inboxLikes.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  No likes yet
                </p>
              ) : (
                <div className="space-y-2">
                  {inboxLikes.slice(0, 4).map((item) => {
                    const likerName = item.liker?.display_name ?? item.liker?.username ?? 'Someone'
                    return (
                      <div key={item.id} className="flex items-center gap-2.5">
                        <Heart size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{likerName}</span> liked your {item.exercise_name} post
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                New posts from friends
              </p>

              {friendPosts.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  No new friend posts
                </p>
              ) : (
                <div className="space-y-2">
                  {friendPosts.slice(0, 4).map((post) => {
                    const name = post.profiles?.display_name ?? post.profiles?.username ?? 'Someone'
                    return (
                      <div key={`inbox-post-${post.id}`} className="flex items-center gap-2.5">
                        <UserAvatar avatarUrl={post.profiles?.avatar_url ?? null} displayName={name} size={20} />
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{name}</span> posted {post.exercise_name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* If falling back to own posts, show an explanation banner */}
          {!hasFriendPosts && (
            <div
              className="px-4 py-3 rounded-xl flex items-center justify-between gap-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Showing your posts — follow people to see theirs
              </p>
              <button
                onClick={() => setShowSearch(true)}
                className="text-xs font-semibold flex-shrink-0"
                style={{ color: 'var(--accent)' }}
              >
                Find people
              </button>
            </div>
          )}

          {displayPosts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user?.id} unit={profile?.unit_preference ?? 'kg'} />
          ))}

          {/* When showing friends' posts, show a link to own profile */}
          {hasFriendPosts && user && (
            <Link href={`/profile/${user.id}`}>
              <div
                className="px-4 py-3 rounded-xl flex items-center justify-between"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  View your own posts
                </p>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  Go to profile →
                </span>
              </div>
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
