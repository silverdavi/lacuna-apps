// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// water-tracker's entries in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  saveState,
  type WaterEntry,
  type WaterState,
} from './index'

const KEY = 'lacuna.water-tracker.state'

export const spaceId = 'mock-water-tracker'

function byDate(a: WaterEntry, b: WaterEntry): number {
  const d = a.date.localeCompare(b.date)
  return d !== 0 ? d : a.createdAt - b.createdAt
}

export const host = {
  read(): WaterState {
    const state = loadState()
    return { ...state, entries: [...state.entries].sort(byDate) }
  },

  write(next: WaterState): WaterState {
    saveState(next)
    return next
  },

  addEntry(date: string, amount: number): WaterState {
    const state = loadState()
    state.entries.push({ id: makeId(), date, amount, createdAt: Date.now() })
    return host.write(state)
  },

  deleteEntry(id: string): WaterState {
    const state = loadState()
    state.entries = state.entries.filter((e) => e.id !== id)
    return host.write(state)
  },

  setGoal(goal: number): WaterState {
    const state = loadState()
    state.goal = goal
    return host.write(state)
  },

  clear(): WaterState {
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
export type { WaterEntry, WaterState }
