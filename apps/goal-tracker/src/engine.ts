// Pure rules, calculations and state transitions for the goal tracker.
// No React, no DOM, no storage: every function takes its inputs explicitly
// (including "today") so the screen code only wires state and markup.

export type CheckIn = {
  date: string // YYYY-MM-DD
  count: number
  goal: number
  createdAt: number
}

export type GoalState = {
  goalName: string
  dailyGoal: number
  checkIns: CheckIn[]
}

export const MONTH_DAYS = 30

export function emptyState(): GoalState {
  return { goalName: 'My goal', dailyGoal: 1, checkIns: [] }
}

// ---- date helpers (local time, keys are YYYY-MM-DD) ----

export function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromKey(key: string): Date {
  return new Date(key + 'T00:00:00')
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfWeek(base: Date): Date {
  const d = new Date(base)
  const offset = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return d
}

export function firstWeekMonday(year: number): Date {
  return startOfWeek(new Date(year, 0, 1))
}

// ---- check-in transitions ----

export function hasCheckIn(checkIns: CheckIn[], date: string): boolean {
  return checkIns.some((c) => c.date === date)
}

export function checkInToday(state: GoalState, today: string, now = Date.now()): GoalState {
  if (hasCheckIn(state.checkIns, today)) return state
  return {
    ...state,
    checkIns: [
      ...state.checkIns,
      { date: today, count: 1, goal: state.dailyGoal, createdAt: now },
    ],
  }
}

export function addPastCheckIn(
  state: GoalState,
  date: string,
  count: number,
  now = Date.now(),
): GoalState {
  const others = state.checkIns.filter((c) => c.date !== date)
  return {
    ...state,
    checkIns: [...others, { date, count, goal: state.dailyGoal, createdAt: now }],
  }
}

export function deleteCheckIn(state: GoalState, date: string): GoalState {
  return { ...state, checkIns: state.checkIns.filter((c) => c.date !== date) }
}

// ---- derived values ----

export function countMap(checkIns: CheckIn[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const c of checkIns) map.set(c.date, c.count)
  return map
}

export function checkedDays(counts: Map<string, number>): Set<string> {
  return new Set([...counts.keys()].filter((d) => (counts.get(d) ?? 0) > 0))
}

// Streaks: a run of consecutive checked-in days. "current" is the run that ends
// on the most recent checked-in day, "longest" is the longest run anywhere.
// A gap (even one) breaks the run.
export function computeStreaks(
  dates: Set<string> | string[],
): { current: number; longest: number } {
  const set = new Set(dates)
  if (!set.size) return { current: 0, longest: 0 }
  const sorted = [...set].sort()
  const toTime = (key: string) => new Date(key + 'T00:00:00').getTime()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = toTime(sorted[i]) - toTime(sorted[i - 1]) === 86400000 ? run + 1 : 1
    if (run > longest) longest = run
  }
  let current = 1
  for (let i = sorted.length - 1; i > 0; i--) {
    if (toTime(sorted[i]) - toTime(sorted[i - 1]) === 86400000) current += 1
    else break
  }
  return { current, longest }
}

export type HeatLevel = 'empty' | 'low' | 'mid' | 'high'

export function heatLevel(count: number): HeatLevel {
  if (count <= 0) return 'empty'
  if (count <= 1) return 'low'
  if (count <= 2) return 'mid'
  return 'high'
}

// Ring: the tracked month's check-ins out of MONTH_DAYS. The tracked month is
// October 2023 whenever any past (2023) check-in exists; otherwise the current
// calendar month, so checking in today fills the ring at once.
export function monthPrefix(
  checkIns: CheckIn[],
  today: string,
): { prefix: string; label: string } {
  const hasPast = checkIns.some((c) => c.date.startsWith('2023-'))
  return {
    prefix: hasPast ? '2023-10' : today.slice(0, 7),
    label: hasPast ? 'Oct 2023' : 'This month',
  }
}

export function monthCount(checkIns: CheckIn[], prefix: string): number {
  return checkIns
    .filter((c) => c.date.startsWith(prefix))
    .reduce((sum, c) => sum + c.count, 0)
}

export function ringPct(count: number, max: number): number {
  return max > 0 ? Math.min(100, (count / max) * 100) : 0
}

// Heatmap: exactly the days of `year`, Monday to Sunday, starting at the first
// week's Monday (so the grid is 53 columns for a non-leap year).
export function yearCells(
  year: number,
  counts: Map<string, number>,
): { key: string; date: Date; count: number }[] {
  const start = firstWeekMonday(year)
  const d1 = new Date(year, 0, 1)
  const d31 = new Date(year, 11, 31)
  const out: { key: string; date: Date; count: number }[] = []
  for (let d = new Date(start); d <= d31; d = addDays(d, 1)) {
    if (d < d1) continue
    const key = toKey(d)
    out.push({ key, date: d, count: counts.get(key) ?? 0 })
  }
  return out
}

export function yearMonthLabels(year: number): { index: number; label: string }[] {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const start = firstWeekMonday(year)
  const labels: { index: number; label: string }[] = []
  let last = -1
  let idx = 0
  for (let d = new Date(start); d <= new Date(year, 11, 31); d = addDays(d, 1)) {
    if (d < new Date(year, 0, 1)) continue
    const m = d.getMonth()
    if (m !== last) {
      labels.push({ index: idx, label: MONTHS[m] })
      last = m
    }
    idx += 1
  }
  return labels
}

export function sortCheckIns(checkIns: CheckIn[]): CheckIn[] {
  return [...checkIns].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
