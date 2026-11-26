import { addDays, fromISODate, startOfMonth, toISODate } from '@lacuna/date-math'
import { occurrencesUntil } from './recurrence'
import type { EventItem, Task } from './types'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function todayISO(): string {
  return toISODate(new Date())
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function monthCells(year: number, month: number): string[] {
  const start = startOfMonth(new Date(year, month, 1))
  const offset = (start.getDay() + 6) % 7
  const cells: string[] = []
  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(year, month, day)
    if (date.getMonth() !== month) break
    cells.push(toISODate(date))
  }
  for (let i = 0; i < offset; i += 1) cells.unshift(toISODate(addDays(start, i - offset)))
  while (cells.length % 7 !== 0) cells.push(toISODate(addDays(new Date(cells[cells.length - 1] + 'T00:00:00'), 1)))
  return cells
}

export function weekDays(anchor: string): string[] {
  const start = fromISODate(anchor) ?? new Date()
  const monday = addDays(start, -((start.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)))
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  recurrence: EventItem['recurrence']
}

const MAX_OCCURRENCES_PER_EVENT = 2

export function calendarEventsFor(events: EventItem[], fromISO: string, toISO: string): CalendarEvent[] {
  const found: CalendarEvent[] = []
  for (const event of events) {
    const dates = occurrencesUntil(event.date, event.recurrence, fromISO, toISO)
    for (const date of dates.slice(0, MAX_OCCURRENCES_PER_EVENT)) {
      found.push({ id: event.id, title: event.title, date, time: event.time, recurrence: event.recurrence })
    }
  }
  found.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
  return found
}

export function occurrencesByDate(events: EventItem[], fromISO: string, toISO: string): Map<string, CalendarEvent[]> {
  const byDate = new Map<string, CalendarEvent[]>()
  for (const event of calendarEventsFor(events, fromISO, toISO)) {
    const list = byDate.get(event.date) ?? []
    list.push(event)
    byDate.set(event.date, list)
  }
  return byDate
}

export function taskDueDates(tasks: Task[], fromISO: string, toISO: string): Map<string, string[]> {
  const byDate = new Map<string, string[]>()
  for (const task of tasks) {
    if (task.done) continue
    const dates = occurrencesUntil(task.due, task.recurrence, fromISO, toISO)
    for (const date of dates) {
      const list = byDate.get(date) ?? []
      list.push(task.title)
      byDate.set(date, list)
    }
  }
  return byDate
}
