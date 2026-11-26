import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface EventRecord {
  id: string
  type: 'event'
  title: string
  date: string
  time: string
  repeat: Repeat
}

export interface TaskRecord {
  id: string
  type: 'task'
  text: string
  done: boolean
}

export type CalRecord = EventRecord | TaskRecord

type BaseRecord = { id: string; type: string }

type EventInput = Omit<EventRecord, 'id'> & { id?: string }
type TaskInput = Omit<TaskRecord, 'id'> & { id?: string }

type EventStore = Omit<MockRecordStore<EventRecord>, 'add' | 'update'> & {
  add(record: EventInput): EventRecord
  update(id: string, patch: Partial<Omit<EventRecord, 'id' | 'type' | 'title' | 'date' | 'time' | 'repeat'>>): EventRecord | undefined
}

type TaskStore = Omit<MockRecordStore<TaskRecord>, 'add' | 'update'> & {
  add(record: TaskInput): TaskRecord
  update(id: string, patch: Partial<Omit<TaskRecord, 'id' | 'type' | 'text' | 'done'>>): TaskRecord | undefined
}

export type FamilyCalendarStore = Omit<MockRecordStore<CalRecord>, 'add' | 'update'> & {
  addEvent(input: EventInput): EventRecord
  addTask(input: TaskInput): TaskRecord
  updateTask(id: string, patch: Partial<Omit<TaskRecord, 'id' | 'type'>>): TaskRecord | undefined
}

export function validateRecord(value: unknown): value is CalRecord {
  if (value === null || typeof value !== 'object') return false
  const r = value as {
    id?: unknown
    type?: unknown
    title?: unknown
    date?: unknown
    time?: unknown
    repeat?: unknown
    text?: unknown
    done?: unknown
  }
  if (typeof r.id !== 'string') return false
  if (r.type === 'event') {
    return (
      typeof r.title === 'string' &&
      typeof r.date === 'string' &&
      typeof r.time === 'string' &&
      (r.repeat === 'none' || r.repeat === 'daily' || r.repeat === 'weekly' || r.repeat === 'monthly' || r.repeat === 'yearly')
    )
  }
  if (r.type === 'task') {
    return typeof r.text === 'string' && typeof r.done === 'boolean'
  }
  return false
}

export function createStore(): FamilyCalendarStore {
  const events = createMockRecordStore<EventRecord>({
    key: 'lacuna.family-calendar.events',
    validate: (v): v is EventRecord => validateRecord(v) && (v as { type?: unknown }).type === 'event',
    idPrefix: 'famcal',
  })
  const tasks = createMockRecordStore<TaskRecord>({
    key: 'lacuna.family-calendar.tasks',
    validate: (v): v is TaskRecord => validateRecord(v) && (v as { type?: unknown }).type === 'task',
    idPrefix: 'famcal',
  })

  function all(): CalRecord[] {
    return [...events.list(), ...tasks.list()]
  }

  function replaceAll(records: CalRecord[]): void {
    events.replaceAll(records.filter((r): r is EventRecord => r.type === 'event'))
    tasks.replaceAll(records.filter((r): r is TaskRecord => r.type === 'task'))
  }

  function clear(): void {
    events.clear()
    tasks.clear()
  }

  return {
    list: () => all(),
    get: (id) => events.get(id) ?? tasks.get(id),
    remove: (id) => events.remove(id) || tasks.remove(id),
    replaceAll,
    clear,
    addEvent: (input) => events.add(input),
    addTask: (input) => tasks.add(input),
    updateTask: (id, patch) => tasks.update(id, patch),
  }
}
