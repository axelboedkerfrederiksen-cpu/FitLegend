'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'

interface DataPoint {
  date: string
  fullDate: string
  weight: number
}

interface Props {
  exerciseName: string
  userId: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="px-3 py-2 rounded-lg text-sm"
      style={{ background: '#27272a', border: '1px solid #3f3f46' }}
    >
      <p style={{ color: '#a1a1aa', marginBottom: 2 }}>{payload[0].payload.fullDate}</p>
      <p className="font-semibold" style={{ color: '#f97316' }}>
        {payload[0].value} kg
      </p>
    </div>
  )
}

export default function ProgressChart({ exerciseName, userId }: Props) {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: rows, error } = await withTimeout(
          createClient()
            .from('workouts')
            .select('created_at, workout_sets!inner(weight_kg, exercise_name)')
            .eq('user_id', userId)
            .eq('workout_sets.exercise_name', exerciseName)
            .order('created_at', { ascending: true })
        )

        if (error) {
          console.error('[ProgressChart]', error.message)
          return
        }

        // Group by date, take the highest weight logged per session
        const byDate = new Map<string, number>()
        ;(rows ?? []).forEach((w: { created_at: string; workout_sets: { weight_kg: number }[] }) => {
          const dateKey = w.created_at.slice(0, 10)
          const maxWeight = Math.max(...w.workout_sets.map((s) => Number(s.weight_kg)))
          byDate.set(dateKey, Math.max(byDate.get(dateKey) ?? 0, maxWeight))
        })

        const points: DataPoint[] = Array.from(byDate.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([iso, weight]) => {
            const d = new Date(iso)
            return {
              date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              fullDate: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              weight,
            }
          })

        setData(points)
      } catch (err) {
        console.error('[ProgressChart] threw:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [exerciseName, userId])

  if (loading) {
    return <div className="h-52 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
  }

  if (data.length < 2) {
    return (
      <div
        className="h-52 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {data.length === 0 ? 'No data yet' : 'Log more sessions to see a trend'}
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl pt-4 pr-2 pb-2 pl-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${v}kg`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: '#f97316', r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
