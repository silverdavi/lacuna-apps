// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// weight-tracker's entries in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  saveState,
  type WeightEntry,
  type WeightState,
} from './index'

const KEY = 'lacuna.weight-tracker.state'

export const spaceId = 'mock-weight-tracker'

function byDate(a: WeightEntry, b: WeightEntry): number {
  const d = a.date.localeCompare(b.date)
  return d !== 0 ? d : a.createdAt - b.createdAt
}

export const host = {
  read(): WeightState {
    return { ...loadState(), entries: [...loadState().entries].sort(byDate) }
  },

  write(next: WeightState): WeightState {
    saveState(next)
    return next
  },

  addEntry(date: string, weight: number): WeightState {
    const state = loadState()
    state.entries.push({ id: makeId(), date, weight, createdAt: Date.now() })
    return host.write(state)
  },

  deleteEntry(id: string): WeightState {
    const state = loadState()
    state.entries = state.entries.filter((e) => e.id !== id)
    return host.write(state)
  },

  clear(): WeightState {
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
export type { WeightEntry, WeightState }
