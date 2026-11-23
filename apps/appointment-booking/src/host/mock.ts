// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Appointment {
  id: string
  /** Client name. */
  name: string
  /** `YYYY-MM-DD` in the browser's local calendar. */
  date: string
  /** `HH:MM` 24-hour. */
  time: string
  /** `HH:MM` 24-hour. Must be after `time`. */
  end: string
  /** Free-form note. */
  notes: string
}

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

/** Days that carry weekly hours; days with no entry are closed. */
export type Availability = Partial<Record<Day, string>>

export const DAYS: Day[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function isDay(v: unknown): v is Day {
  return typeof v === 'string' && (DAYS as string[]).includes(v)
}

function isAppointment(v: unknown): v is Appointment {
  const a = v as {
    id?: unknown
    name?: unknown
    date?: unknown
    time?: unknown
    end?: unknown
    notes?: unknown
  }
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    a.name.trim().length > 0 &&
    typeof a.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(a.date) &&
    typeof a.time === 'string' &&
    /^\d{2}:\d{2}$/.test(a.time) &&
    typeof a.end === 'string' &&
    /^\d{2}:\d{2}$/.test(a.end) &&
    typeof a.notes === 'string'
  )
}

function isAvailability(v: unknown): v is Record<Day, string> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const obj = v as Record<string, unknown>
  return Object.keys(obj).length > 0
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

export const APPOINTMENT_KEY = `lacuna.appointment-booking:${BRANCH}:appointments`
export const AVAILABILITY_KEY = `lacuna.appointment-booking:${BRANCH}:availability`

export function appointmentStore() {
  return createMockRecordStore<Appointment>({
    key: APPOINTMENT_KEY,
    idPrefix: 'appt',
    validate: isAppointment,
  })
}

export function availabilityValue() {
  return createMockValue<Availability>({
    key: AVAILABILITY_KEY,
    fallback: {
      Monday: '08:00–17:00',
      Tuesday: '08:00–17:00',
      Wednesday: '08:00–17:00',
      Thursday: '08:00–17:00',
      Friday: '08:00–17:00',
    },
    validate: isAvailability,
  })
}
