'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, X, Users } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { useFeedPosts } from '@/hooks/usePosts'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { Profile } from '@/lib/types'
import PostCard from '@/components/PostCard'
import UserAvatar from '@/components/UserAvatar'

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
  const { user, loading: authLoading } = useAuth()
  const { friendPosts, ownPosts, loading: postsLoading, refetch } = useFeedPosts(user?.id ?? null)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<(Profile & { is_following: boolean })[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

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
            <PostCard key={post.id} post={post} />
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
