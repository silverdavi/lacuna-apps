import { useEffect, useState } from 'react'
import { addEvent, listEvents, removeEvent, updateEvent } from './persistence'
import type { EventData, EventItem } from './types'

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>(() => listEvents())

  useEffect(() => {
    setEvents(listEvents())
  }, [])

  function add(input: EventData): void {
    addEvent(input)
    setEvents(listEvents())
  }

  function update(id: string, patch: Partial<EventItem>): void {
    updateEvent(id, patch)
    setEvents(listEvents())
  }

  function remove(id: string): void {
    removeEvent(id)
    setEvents(listEvents())
  }

  return { events, isLoading: false, add, update, remove }
}
