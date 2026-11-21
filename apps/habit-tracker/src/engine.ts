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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function lastSeven(today: Date): DayCell[] {
  const out: DayCell[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push({ key: dayKey(d), label: i === 0 ? 'Today' : i === 1 ? '1 day ago' : `${i} days ago` })
  }
  return out
}

export function isDone(habit: Habit, day: string): boolean {
  return habit.done.includes(day)
}

export function streak(habit: Habit, today: Date): number {
  let n = 0
  const d = new Date(today)
  if (habit.done.includes(dayKey(d))) n += 1
  for (;;) {
    d.setDate(d.getDate() - 1)
    if (habit.done.includes(dayKey(d))) n += 1
    else break
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
