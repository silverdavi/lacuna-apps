import { store, type DayRecord, type DayTask } from './mock'

export type { DayRecord, DayTask }

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
