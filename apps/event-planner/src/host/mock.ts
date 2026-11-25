// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Recurrence {
  /** `daily`, `weekly`, `monthly` or `yearly`. */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  /** Repeat every N days/weeks/months/years. */
  interval: number
  /** Stop after this many occurrences. */
  maxOccurrences?: number
  /** `YYYY-MM-DD`. Stop on this date. */
  until?: string
}

export interface EvEvent {
  id: string
  title: string
  /** `YYYY-MM-DD` in the browser's local calendar. */
  date: string
  /** `HH:MM` 24-hour. */
  start: string
  /** `HH:MM` 24-hour. Must be after `start`. */
  end: string
  notes: string
  recurrence: Recurrence | null
}

export interface EvTask {
  id: string
  name: string
  owner: string
  /** `YYYY-MM-DD`. */
  start: string
  /** `YYYY-MM-DD`. Must be on or after `start`. */
  due: string
  notes: string
}

function isDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function isTime(v: unknown): v is string {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)
}

const FREQUENCIES: Recurrence['frequency'][] = ['daily', 'weekly', 'monthly', 'yearly']

function isRecurrence(v: unknown): v is Recurrence | null {
  if (v === null) return true
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const r = v as {
    frequency?: unknown
    interval?: unknown
    maxOccurrences?: unknown
    until?: unknown
  }
  return (
    typeof r.frequency === 'string' &&
    FREQUENCIES.includes(r.frequency as Recurrence['frequency']) &&
    typeof r.interval === 'number' &&
    r.interval >= 1 &&
    (r.maxOccurrences === undefined ||
      (typeof r.maxOccurrences === 'number' && r.maxOccurrences >= 1)) &&
    (r.until === undefined || isDate(r.until))
  )
}

export function isEvent(v: unknown): v is EvEvent {
  const e = v as {
    id?: unknown
    title?: unknown
    date?: unknown
    start?: unknown
    end?: unknown
    notes?: unknown
    recurrence?: unknown
  }
  return (
    typeof e.id === 'string' &&
    typeof e.title === 'string' &&
    e.title.trim().length > 0 &&
    isDate(e.date) &&
    isTime(e.start) &&
    isTime(e.end) &&
    typeof e.notes === 'string' &&
    isRecurrence(e.recurrence)
  )
}

export function isTask(v: unknown): v is EvTask {
  const t = v as {
    id?: unknown
    name?: unknown
    owner?: unknown
    start?: unknown
    due?: unknown
    notes?: unknown
  }
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    t.name.trim().length > 0 &&
    typeof t.owner === 'string' &&
    isDate(t.start) &&
    isDate(t.due) &&
    typeof t.notes === 'string'
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

export const EVENTS_KEY = `lacuna.event-planner:${BRANCH}:events`
export const TASKS_KEY = `lacuna.event-planner:${BRANCH}:tasks`

export function eventStore() {
  return createMockRecordStore<EvEvent>({
    key: EVENTS_KEY,
    idPrefix: 'evt',
    validate: isEvent,
  })
}

export function taskStore() {
  return createMockRecordStore<EvTask>({
    key: TASKS_KEY,
    idPrefix: 'task',
    validate: isTask,
  })
}
