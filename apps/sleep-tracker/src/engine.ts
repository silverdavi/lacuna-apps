// Pure rules, calculations and state transitions for the sleep tracker.
// No React, no DOM, no storage: everything takes data in and returns data out.

export const QUALITIES = ['Poor', 'Fair', 'Good', 'Great'] as const
export type Quality = (typeof QUALITIES)[number]

export type SleepEntry = {
  id: string
  date: string // YYYY-MM-DD
  minutes: number // total minutes slept
  quality: Quality
  createdAt: number
}

export type SleepState = {
  entries: SleepEntry[]
}

const DAY = 86400000

export const emptyState = (): SleepState => ({ entries: [] })

export function isQuality(value: unknown): value is Quality {
  return (QUALITIES as readonly string[]).includes(value as string)
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export function dayTime(date: string): number {
  return Date.parse(`${date}T00:00:00Z`)
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${`${m}`.padStart(2, '0')}m`
}

/** Parse "7h 30m", "8h", "45m" or a bare minute count. null when invalid. */
export function parseDuration(text: string): number | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const m = t.match(/^(\d+)\s*h(?:\s*(\d{1,2})\s*m?)?$/)
  if (m) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0)
  const h = t.match(/^(\d{1,2})\s*m$/)
  if (h) return Number(h[1])
  const all = t.match(/^(\d+)$/)
  if (all) return Number(all[1])
  return null
}

/** True when the text parses to a positive number of minutes. */
export function isLoggable(text: string): boolean {
  const minutes = parseDuration(text)
  return minutes !== null && minutes > 0
}

/** Current streak: consecutive days ending at the most recent entry. */
export function computeStreak(entries: SleepEntry[]): number {
  if (!entries.length) return 0
  const days = new Set(entries.map((e) => dayTime(e.date)))
  const max = Math.max(...entries.map((e) => dayTime(e.date)))
  let streak = 0
  let cursor = max
  while (days.has(cursor)) {
    streak += 1
    cursor -= DAY
  }
  return streak
}

/** Average minutes across all entries, rounded to the nearest minute. */
export function averageMinutes(entries: SleepEntry[]): number {
  if (!entries.length) return 0
  const total = entries.reduce((n, e) => n + e.minutes, 0)
  return Math.floor(total / entries.length + 0.5)
}

export type Summary = {
  nights: number
  average: number
  streak: number
}

export function summarize(entries: SleepEntry[]): Summary {
  return {
    nights: entries.length,
    average: averageMinutes(entries),
    streak: computeStreak(entries),
  }
}

function byDate(a: SleepEntry, b: SleepEntry): number {
  const d = a.date.localeCompare(b.date)
  return d !== 0 ? d : a.createdAt - b.createdAt
}

/** Sorted copy of entries: date ascending, then creation order. */
export function sortEntries(entries: SleepEntry[]): SleepEntry[] {
  return [...entries].sort(byDate)
}

export function addEntry(
  state: SleepState,
  entry: Omit<SleepEntry, 'id'>,
  id: () => string,
): SleepState {
  const full: SleepEntry = {
    date: entry.date,
    minutes: entry.minutes,
    quality: entry.quality,
    createdAt: entry.createdAt,
    id: id(),
  }
  return { entries: [...state.entries, full] }
}

export function deleteEntry(state: SleepState, id: string): SleepState {
  return { entries: state.entries.filter((e) => e.id !== id) }
}

export type HeatmapCell = {
  date: string
  minutes: number
  label: string
}

/** One cell per distinct date, oldest first, with its formatted duration. */
export function heatmapCells(entries: SleepEntry[]): HeatmapCell[] {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  return [...byDate.keys()]
    .sort()
    .map((date) => ({
      date,
      minutes: byDate.get(date)!.minutes,
      label: formatDuration(byDate.get(date)!.minutes),
    }))
}

export type TrendPoint = {
  date: string
  id: string
  hours: number
  label: string
}

/** One data point per entry in logged order, hours to one decimal for display. */
export function trendPoints(entries: SleepEntry[]): TrendPoint[] {
  return entries.map((e) => ({
    date: e.date,
    id: e.id,
    hours: e.minutes / 60,
    label: Number((e.minutes / 60).toFixed(1)).toString(),
  }))
}
