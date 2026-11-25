import { eventStore, type CalendarEvent } from './mock'

export type { CalendarEvent }

const events = eventStore()

export function listEvents(): CalendarEvent[] {
  return events.list()
}

export function addEvent(input: Omit<CalendarEvent, 'id'> & { id?: string }): CalendarEvent {
  return events.add(input)
}

export function removeEvent(id: string): boolean {
  return events.remove(id)
}

export function uid(prefix = 'evt'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
