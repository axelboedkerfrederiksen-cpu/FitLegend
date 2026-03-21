'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useWorkouts } from '@/hooks/useWorkouts'
import WorkoutCard from '@/components/WorkoutCard'

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const { workouts, loading: workoutsLoading } = useWorkouts(user?.id ?? null)
  const loading = authLoading || workoutsLoading

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <div className="px-4 pt-12 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          History
        </h1>
        <Link href="/log">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Log
          </div>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center pt-16">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : workouts.length === 0 ? (
        <div className="px-4 pt-20 flex flex-col items-center gap-3 text-center">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            No workouts yet
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Log your first session to see it here
          </p>
          <Link href="/log">
            <div
              className="mt-2 px-4 py-2 rounded-[10px] font-semibold text-sm text-white"
              style={{ background: 'var(--accent)' }}
            >
              Log Workout
            </div>
          </Link>
        </div>
      ) : (
        <div
          className="mx-4 rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {workouts.map((workout, i) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              isLast={i === workouts.length - 1}
            />
          ))}
        </div>
      )}
    </main>
  )
}
