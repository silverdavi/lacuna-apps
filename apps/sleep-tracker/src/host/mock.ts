// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// sleep-tracker's entries in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  saveState,
  type Quality,
  type SleepEntry,
  type SleepState,
} from './index'

const KEY = 'lacuna.sleep-tracker.state'

export const spaceId = 'mock-sleep-tracker'

function byDate(a: SleepEntry, b: SleepEntry): number {
  const d = a.date.localeCompare(b.date)
  return d !== 0 ? d : a.createdAt - b.createdAt
}

export const host = {
  read(): SleepState {
    const state = loadState()
    return { ...state, entries: [...state.entries].sort(byDate) }
  },

  write(next: SleepState): SleepState {
    saveState(next)
    return next
  },

  addEntry(date: string, minutes: number, quality: Quality): SleepState {
    const state = loadState()
    state.entries.push({ id: makeId(), date, minutes, quality, createdAt: Date.now() })
    return host.write(state)
  },

  deleteEntry(id: string): SleepState {
    const state = loadState()
    state.entries = state.entries.filter((e) => e.id !== id)
    return host.write(state)
  },

  clear(): SleepState {
    return host.write(emptyState())
  },

  reset(): void {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}

export { KEY }
export type { SleepEntry, SleepState }
