'use client'

interface Props {
  workoutDates: string[]
  loading?: boolean
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NUM_WEEKS = 12
const CELL = 14
const GAP = 2

// Returns yyyy-mm-dd for a Date object
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Returns the Monday of the week containing `d`
function mondayOf(d: Date): Date {
  const copy = new Date(d)
  const dow = copy.getDay() // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1
  copy.setDate(copy.getDate() - offset)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export default function StreakCalendar({ workoutDates, loading = false }: Props) {
  if (loading) {
    return (
      <div
        className="rounded-xl p-4 animate-pulse"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 120 }}
      />
    )
  }

  const dateSet = new Set(workoutDates)

  // Build 12-week grid ending on the current week's Sunday
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentMonday = mondayOf(today)

  // Start 11 weeks back
  const startMonday = new Date(currentMonday)
  startMonday.setDate(startMonday.getDate() - (NUM_WEEKS - 1) * 7)

  // columns = weeks, rows = Mon..Sun (0=Mon, 6=Sun)
  const weeks: Date[][] = []
  for (let w = 0; w < NUM_WEEKS; w++) {
    const col: Date[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(startMonday)
      day.setDate(day.getDate() + w * 7 + d)
      col.push(day)
    }
    weeks.push(col)
  }

  // Month labels: one per column where month changes
  const monthLabels: (string | null)[] = weeks.map((col, wi) => {
    const month = col[0].getMonth()
    if (wi === 0) return MONTH_ABBR[month]
    const prevMonth = weeks[wi - 1][0].getMonth()
    if (month !== prevMonth) return MONTH_ABBR[month]
    return null
  })

  const totalW = NUM_WEEKS * CELL + (NUM_WEEKS - 1) * GAP
  const labelColW = 14 // px for row labels (M/W/F)
  const containerW = labelColW + GAP + totalW

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ width: containerW, minWidth: containerW }}>
        {/* Month row */}
        <div style={{ display: 'flex', marginLeft: labelColW + GAP, marginBottom: 4 }}>
          {weeks.map((_, wi) => (
            <div
              key={wi}
              style={{
                width: CELL,
                marginRight: wi < NUM_WEEKS - 1 ? GAP : 0,
                fontSize: 9,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'visible',
              }}
            >
              {monthLabels[wi] ?? ''}
            </div>
          ))}
        </div>

        {/* Grid rows: Mon(0) … Sun(6) */}
        {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
          const rowLabel = dayIdx === 0 ? 'M' : dayIdx === 2 ? 'W' : dayIdx === 4 ? 'F' : ''
          return (
            <div
              key={dayIdx}
              style={{ display: 'flex', alignItems: 'center', marginBottom: dayIdx < 6 ? GAP : 0 }}
            >
              {/* Row label */}
              <div
                style={{
                  width: labelColW,
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  textAlign: 'right',
                  paddingRight: 4,
                  flexShrink: 0,
                }}
              >
                {rowLabel}
              </div>

              {/* Cells */}
              {weeks.map((col, wi) => {
                const day = col[dayIdx]
                const iso = toIso(day)
                const hasWorkout = dateSet.has(iso)
                const isFuture = day > today
                return (
                  <div
                    key={wi}
                    title={iso}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 3,
                      marginRight: wi < NUM_WEEKS - 1 ? GAP : 0,
                      background: isFuture
                        ? 'transparent'
                        : hasWorkout
                        ? 'rgba(249,115,22,0.8)'
                        : 'var(--surface)',
                      border: isFuture ? 'none' : '1px solid var(--border)',
                    }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
