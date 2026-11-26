import { eventStore, taskStore, type EvEvent, type EvTask, type Recurrence } from './mock'

export type { EvEvent, EvTask, Recurrence }

const events = eventStore()
const tasks = taskStore()

export function listEvents(): EvEvent[] {
  return events.list()
}

export function addEvent(input: Omit<EvEvent, 'id'>): EvEvent {
  return events.add(input)
}

export function removeEvent(id: string): boolean {
  return events.remove(id)
}

export function listTasks(): EvTask[] {
  return tasks.list()
}

export function addTask(input: Omit<EvTask, 'id'>): EvTask {
  return tasks.add(input)
}

export function updateTask(id: string, patch: Partial<Omit<EvTask, 'id'>>): EvTask | undefined {
  return tasks.update(id, patch)
}

export function removeTask(id: string): boolean {
  return tasks.remove(id)
}
