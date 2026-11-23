import { createMockRecordStore } from '@lacuna/host-mock'

export interface DayTask {
  label: string
  done: boolean
}

export interface DayRecord {
  id: string
  day: string
  tasks: DayTask[]
}

const KEY = 'lacuna.bullet-journal.mock.v1'

function isDayTask(v: unknown): v is DayTask {
  const t = v as { label?: unknown; done?: unknown }
  return typeof t.label === 'string' && typeof t.done === 'boolean'
}

function isDayRecord(v: unknown): v is DayRecord {
  const r = v as { id?: unknown; day?: unknown; tasks?: unknown }
  return (
    typeof r.id === 'string' &&
    typeof r.day === 'string' &&
    Array.isArray(r.tasks) &&
    r.tasks.every(isDayTask)
  )
}

export const store = createMockRecordStore<DayRecord>({
  key: KEY,
  validate: isDayRecord,
})
