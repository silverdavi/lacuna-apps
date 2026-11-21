import { addDays, toISODate } from '@lacuna/date-math'

export interface Habit {
  id: string
  name: string
  done: string[]
}

export interface DayCell {
  key: string
  label: string
}

export function dayKey(d: Date): string {
  return toISODate(d)
}

export function lastSeven(today: Date): DayCell[] {
  const out: DayCell[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = addDays(today, -i)
    out.push({ key: toISODate(d), label: i === 0 ? 'Today' : i === 1 ? '1 day ago' : `${i} days ago` })
  }
  return out
}

export function isDone(habit: Habit, day: string): boolean {
  return habit.done.includes(day)
}

export function streak(habit: Habit, today: Date): number {
  let n = 0
  let d = new Date(today)
  // If today is ticked, count it; otherwise start from yesterday
  if (habit.done.includes(toISODate(d))) {
    n += 1
    d = addDays(d, -1)
  } else {
    d = addDays(d, -1)
  }
  // Walk backward while days are ticked
  for (;;) {
    if (habit.done.includes(toISODate(d))) n += 1
    else break
    d = addDays(d, -1)
  }
  return n
}

export function validateName(name: string, habits: Habit[]): string {
  const n = name.trim()
  if (!n) return 'Enter a habit name.'
  if (habits.some((h) => h.name.toLowerCase() === n.toLowerCase())) return 'That habit already exists.'
  return ''
}

export function toggleDone(habits: Habit[], id: string, day: string): Habit[] {
  return habits.map((h) => {
    if (h.id !== id) return h
    const has = h.done.includes(day)
    return { ...h, done: has ? h.done.filter((d) => d !== day) : [...h.done, day] }
  })
}

export function rename(habits: Habit[], id: string, name: string): Habit[] {
  const n = name.trim()
  if (!n) return habits
  return habits.map((h) => (h.id === id ? { ...h, name: n } : h))
}

export function remove(habits: Habit[], id: string): Habit[] {
  return habits.filter((h) => h.id !== id)
}
