// Pure rules, calculations and state transitions for the habit heatmap.
// No React, no DOM, no storage: every function takes its inputs explicitly
// (including "today") so the screen code only wires state and markup.

import type { Habit, HabitState } from './host/index'

export { type Habit, type HabitState }

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

// ---- habit transitions ----

export function addHabit(state: HabitState, name: string, now = Date.now()): HabitState {
  const trimmed = name.trim()
  if (!trimmed) return state
  const habit: Habit = { id: `h-${now}-${state.habits.length}`, name: trimmed, createdAt: now }
  return { ...state, habits: [...state.habits, habit] }
}

export function removeHabit(state: HabitState, id: string): HabitState {
  return { ...state, habits: state.habits.filter((h) => h.id !== id) }
}

export function toggleCompletion(state: HabitState, date: string): HabitState {
  const has = state.completions.includes(date)
  return {
    ...state,
    completions: has
      ? state.completions.filter((d) => d !== date)
      : [...state.completions, date],
  }
}

// ---- derived values ----

export function completionSet(completions: string[]): Set<string> {
  return new Set(completions)
}

// Streaks: a run of consecutive completed days. "current" is the run ending on
// the most recent completed day (or the day before, if today isn't logged yet),
// "longest" is the longest run anywhere. A gap (even one) breaks the run.
// Streaks: a run of consecutive completed days. "current" is the run ending on
// the most recent completed day (extended through today if today isn't logged
// but yesterday is), "longest" is the longest run anywhere. A gap breaks a run.
export function computeStreaks(
  dates: Set<string> | string[],
  today?: string,
): { current: number; longest: number } {
  const set = new Set(dates)
  if (!set.size) return { current: 0, longest: 0 }
  const sorted = [...set].sort()
  const toTime = (key: string) => new Date(key + 'T00:00:00').getTime()
  const isConsecutive = (prev: string, next: string) =>
    Math.abs(toTime(next) - toTime(prev)) === 86400000
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = isConsecutive(sorted[i - 1], sorted[i]) ? run + 1 : 1
    if (run > longest) longest = run
  }
  let current = 1
  for (let i = sorted.length - 1; i > 0; i--) {
    if (isConsecutive(sorted[i - 1], sorted[i])) current += 1
    else break
  }
  if (
    today
    && !set.has(today)
    && set.has(toKey(addDays(fromKey(today), -1)))
  ) {
    current += 1
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

export function countMap(completions: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const c of completions) map.set(c, (map.get(c) ?? 0) + 1)
  return map
}
