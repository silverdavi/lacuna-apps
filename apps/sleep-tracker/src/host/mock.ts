// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// sleep-tracker's entries in localStorage so the whole app runs offline.
// Backed by @lacuna/host-mock: corrupt or missing storage degrades to empty
// instead of throwing, and validation lives in src/host/index.ts.
import { createMockRecordStore } from '@lacuna/host-mock'
import { KEY, emptyState, isSleepEntry, normalizeEntry, type Quality, type SleepEntry, type SleepState } from './index'

export const spaceId = 'mock-sleep-tracker'

const store = createMockRecordStore<SleepEntry>({
  key: KEY,
  validate: isSleepEntry,
})

function byDate(a: SleepEntry, b: SleepEntry): number {
  const d = a.date.localeCompare(b.date)
  return d !== 0 ? d : a.createdAt - b.createdAt
}

function read(): SleepState {
  const entries = store.list().map(normalizeEntry)
  return { ...emptyState(), entries: [...entries].sort(byDate) }
}

export const host = {
  read,

  write(next: SleepState): SleepState {
    store.replaceAll(next.entries.map(normalizeEntry))
    return next
  },

  addEntry(date: string, minutes: number, quality: Quality): SleepState {
    const entry = normalizeEntry({ id: '', date, minutes, quality, createdAt: Date.now() })
    store.add(entry)
    return read()
  },

  deleteEntry(id: string): SleepState {
    store.remove(id)
    return read()
  },

  clear(): SleepState {
    store.clear()
    return read()
  },

  reset(): void {
    store.clear()
  },
}

export { KEY }
export type { SleepEntry, SleepState }
