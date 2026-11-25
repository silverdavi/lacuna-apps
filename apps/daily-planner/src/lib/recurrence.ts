import { occurrencesBetween } from '@lacuna/recurrence'
import { addDays, addMonths, addWeeks, toISODate } from '@lacuna/date-math'
import type { Recurrence } from './types'

const FREQ_MAP: Record<string, 'daily' | 'weekly' | 'monthly'> = {
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
}

export function occurrencesUntil(due: string, recurrence: Recurrence, fromISO: string, toISO: string): string[] {
  if (recurrence === 'none') {
    return due >= fromISO && due <= toISO ? [due] : []
  }
  const freq = FREQ_MAP[recurrence]
  if (!freq) return due >= fromISO && due <= toISO ? [due] : []
  const rule = { frequency: freq, interval: 1, startDate: due }
  return occurrencesBetween(rule, fromISO, toISO)
}

export function recurringSeries(due: string, recurrence: Recurrence, count: number): string[] {
  if (recurrence === 'none' || count <= 0) return []
  let step: (d: Date) => Date
  if (recurrence === 'Daily') step = (d) => addDays(d, 1)
  else if (recurrence === 'Weekly') step = (d) => addWeeks(d, 1)
  else step = (d) => addMonths(d, 1)
  const results: string[] = []
  let cursor = new Date(`${due}T00:00:00`)
  for (let i = 0; i < count; i += 1) {
    results.push(toISODate(cursor))
    cursor = step(cursor)
  }
  return results
}
