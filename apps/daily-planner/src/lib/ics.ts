import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import type { EventItem } from './types'

export function eventsToIcs(events: EventItem[]): string {
  const items: IcsEvent[] = events.map((event) => ({
    id: event.id,
    summary: event.title,
    startDate: event.time ? `${event.date}T${event.time}:00` : event.date,
    allDay: !event.time,
    recurrence:
      event.recurrence === 'none'
        ? undefined
        : {
            frequency: event.recurrence.toLowerCase() as 'daily' | 'weekly' | 'monthly',
            interval: 1,
            maxOccurrences: 30,
          },
  }))
  return toIcs(items)
}
