import { computeStreaks } from '@lacuna/streak-calc'
import { addDays, toISODate } from '@lacuna/date-math'
import type { Task } from './types'

export interface DayReport {
  iso: string
  completed: string[]
  scheduled: string[]
  completionRate: number
  streak: number
}

export function buildReport(tasks: Task[], iso: string): DayReport {
  const completed = tasks.filter((t) => t.done && t.due === iso).map((t) => t.title)
  const scheduled = tasks
    .filter((t) => !t.done && t.due <= iso)
    .map((t) => t.title)
  const total = completed.length + scheduled.length
  const completionRate = total === 0 ? 0 : completed.length / total
  const checkIns: string[] = []
  for (let i = 0; i < 120; i += 1) {
    const day = toISODate(addDays(new Date(`${iso}T00:00:00`), -i))
    const dayTasks = tasks.filter((t) => t.due === day)
    if (dayTasks.length > 0 && dayTasks.every((t) => t.done)) checkIns.push(day)
  }
  const streak = computeStreaks(checkIns, { today: iso }).current
  return { iso, completed, scheduled, completionRate, streak }
}
