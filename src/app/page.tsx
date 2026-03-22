'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import UserAvatar from '@/components/UserAvatar'
import WorkoutCard from '@/components/WorkoutCard'

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`
  return Math.round(kg).toLocaleString()
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { stats, loading: statsLoading, error: statsError, refetch } = useDashboardStats(user?.id ?? null)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const displayName =
    profile?.display_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'there'

  const firstName = displayName.split(' ')[0]

  const hour = new Date().getHours()
  const greeting =
    hour < 6 ? 'Good night' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' :
    'Good night'

  const motivationalMessages = [
    `Ready for the gym today, ${firstName}? 💪`,
    `Let's get after it, ${firstName}! 🔥`,
    `Time to make gains, ${firstName} 🏋️`,
    `You showed up. That's already a win, ${firstName} ⚡`,
    `No days off, ${firstName} 💥`,
    `Champions are made in the gym, ${firstName} 🏆`,
    `Another day, another PR, ${firstName}? 📈`,
    `Your future self will thank you, ${firstName} 🙌`,
    `Stay consistent, ${firstName}. It adds up 🧱`,
    `Beast mode on, ${firstName} 🐉`,
  ]
  const motivationalMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]

  const statCards = [
    {
      label: 'Total Workouts',
      value: stats.totalWorkouts !== null ? String(stats.totalWorkouts) : null,
    },
    {
      label: 'Day Streak',
      value: stats.streak !== null ? `${stats.streak}d` : null,
    },
    {
      label: 'Volume This Week',
      value: stats.weeklyVolume !== null ? `${fmtVolume(stats.weeklyVolume)} kg` : null,
    },
    {
      label: 'Best Lift',
      value: stats.latestPR ? `${stats.latestPR.weight} kg` : null,
      sub: stats.latestPR?.exercise,
    },
  ]

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{greeting}</p>
          <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {motivationalMessage}
          </p>
        </div>
        <Link href="/settings">
          <UserAvatar
            avatarUrl={profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null}
            displayName={displayName}
            size={40}
          />
        </Link>
      </div>

      {/* Log CTA */}
      <div className="px-4 mb-6">
        <Link href="/log">
          <div
            className="w-full py-3 rounded-[10px] flex items-center justify-center font-semibold text-sm text-white"
            style={{ background: 'var(--accent)' }}
          >
            Log Workout
          </div>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {statsLoading ? (
                <div className="h-7 w-12 rounded animate-pulse mb-1" style={{ background: 'var(--border)' }} />
              ) : statsError ? (
                <p className="text-xl font-bold" style={{ color: 'var(--text-muted)' }}>—</p>
              ) : (
                <p
                  className="text-2xl font-bold"
                  style={{ color: stat.value ? 'var(--text-primary)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {stat.value ?? '—'}
                </p>
              )}
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </p>
              {stat.sub && !statsLoading && (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  {stat.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Stats retry button */}
        {statsError && !statsLoading && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={refetch}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Couldn&apos;t load stats — tap to retry
            </button>
          </div>
        )}
      </div>

      {/* Recent workouts */}
      {statsLoading ? (
        <div className="px-4 mb-6">
          <div className="h-4 w-28 rounded animate-pulse mb-3" style={{ background: 'var(--border)' }} />
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse"
                style={{
                  background: 'var(--surface)',
                  borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      ) : !statsError && stats.recentWorkouts.length > 0 ? (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Recent workouts</p>
            <Link href="/history">
              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>See all</span>
            </Link>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {stats.recentWorkouts.map((workout, i) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                isLast={i === stats.recentWorkouts.length - 1}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Quick links */}
      <div className="px-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Quick access</p>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {[
            { href: '/history', label: 'Workout History', desc: 'All your sessions' },
            { href: '/progress', label: 'Progress', desc: 'Track your gains' },
            { href: '/feed', label: 'Social Feed', desc: 'See what others are lifting' },
          ].map((item, i, arr) => (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center justify-between px-4 py-3.5"
                style={{
                  background: 'var(--surface)',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
