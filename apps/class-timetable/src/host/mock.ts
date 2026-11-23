// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Class {
  id: string
  /** Class name, e.g. "Math". */
  name: string
  /** Weekday the class runs on. */
  day: Day
  /** `HH:MM` 24-hour. */
  start: string
  /** `HH:MM` 24-hour. Must be after `start`. */
  end: string
}

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

export const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function isDay(v: unknown): v is Day {
  return typeof v === 'string' && (DAYS as string[]).includes(v)
}

function isTime(v: unknown): v is string {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)
}

function isClass(v: unknown): v is Class {
  const c = v as {
    id?: unknown
    name?: unknown
    day?: unknown
    start?: unknown
    end?: unknown
  }
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    isDay(c.day) &&
    isTime(c.start) &&
    isTime(c.end)
  )
}

function storageKey(): string {
  try {
    const el = document.getElementById('root')
    return el?.getAttribute('data-branch') ?? 'default'
  } catch {
    return 'default'
  }
}

const BRANCH = storageKey()

export const CLASS_KEY = `lacuna.class-timetable:${BRANCH}:classes`

export function classStore() {
  return createMockRecordStore<Class>({
    key: CLASS_KEY,
    idPrefix: 'cls',
    validate: isClass,
  })
}
