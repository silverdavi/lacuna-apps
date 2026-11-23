import { createMockRecordStore } from '@lacuna/host-mock'

export interface Entry {
  id: string
  name: string
  date: string
  status: 'Present' | 'Absent' | 'Late'
}

const KEY = 'lacuna.attendance-tracker.mock.v1'

function isEntry(v: unknown): v is Entry {
  const e = v as { id?: unknown; name?: unknown; date?: unknown; status?: unknown }
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.date === 'string' &&
    (e.status === 'Present' || e.status === 'Absent' || e.status === 'Late')
  )
}

export const store = createMockRecordStore<Entry>({
  key: KEY,
  validate: isEntry,
})
