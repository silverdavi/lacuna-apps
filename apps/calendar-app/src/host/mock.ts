// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface CalendarEvent {
  id: string
  /** Event title. */
  title: string
  /** `YYYY-MM-DD` in the browser's local calendar. */
  date: string
  /** `HH:MM` 24-hour, or `''` for an all-day event. */
  time: string
}

function isCalendarEvent(v: unknown): v is CalendarEvent {
  const e = v as {
    id?: unknown
    title?: unknown
    date?: unknown
    time?: unknown
  }
  return (
    typeof e.id === 'string' &&
    typeof e.title === 'string' &&
    e.title.trim().length > 0 &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.time === 'string' &&
    (e.time === '' || /^\d{2}:\d{2}$/.test(e.time))
  )
}

export const EVENTS_KEY = 'lacuna.calendar-app:events'

export function eventStore() {
  return createMockRecordStore<CalendarEvent>({
    key: EVENTS_KEY,
    idPrefix: 'evt',
    validate: isCalendarEvent,
  })
}
