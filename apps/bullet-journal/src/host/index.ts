import { store, type DayRecord, type DayTask } from './mock'

export type { DayRecord, DayTask }
export { store }

export type Day = { date: string; tasks: DayTask[] }

export function readDays(s: typeof store = store): Record<string, Day> {
  const out: Record<string, Day> = {}
  for (const rec of s.list()) out[rec.day] = { date: rec.day, tasks: rec.tasks }
  return out
}

export function writeDays(s: typeof store = store, days: Record<string, Day>) {
  const records: DayRecord[] = Object.values(days).map((d, i) => ({
    id: s.list().find((r) => r.day === d.date)?.id ?? `bj-${d.date}-${i}`,
    day: d.date,
    tasks: d.tasks,
  }))
  s.replaceAll(records)
}

export function tasksForDay(day: string): DayTask[] {
  for (const rec of store.list()) {
    if (rec.day === day) return rec.tasks
  }
  return []
}

export function setTasksForDay(day: string, tasks: DayTask[]) {
  const existing = store.list().find((r) => r.day === day)
  if (existing) {
    store.update(existing.id, { tasks })
  } else {
    store.add({ day, tasks })
  }
}
