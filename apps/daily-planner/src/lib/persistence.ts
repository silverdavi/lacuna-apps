import { addTask, clearDone, listTasks, removeTask, updateTask } from './store'
import type { EventData, EventItem } from './types'
import { createMockRecordStore } from '@lacuna/host-mock'

const EVENTS_KEY = 'lacuna.daily-planner.events'

export const eventStore = createMockRecordStore<EventItem>({
  key: EVENTS_KEY,
})

export function listEvents(): EventItem[] {
  return eventStore.list()
}

export function addEvent(input: EventData): EventItem {
  const now = Date.now()
  const event: EventItem = { ...input, id: `evt-${now}`, createdAt: now }
  eventStore.add(event)
  return event
}

export function updateEvent(id: string, patch: Partial<EventItem>): void {
  eventStore.update(id, patch)
}

export function removeEvent(id: string): void {
  eventStore.remove(id)
}

export { addTask, clearDone, listTasks, removeTask, updateTask }
