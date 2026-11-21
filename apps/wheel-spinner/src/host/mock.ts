// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// wheel-spinner's entries and spin log in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  saveState,
  type SpinRecord,
  type WheelEntry,
  type WheelState,
} from './index'

const KEY = 'lacuna.wheel-spinner.state'

export const spaceId = 'mock-wheel-spinner'

export const host = {
  read(): WheelState {
    return { ...loadState(), entries: [...loadState().entries] }
  },

  write(next: WheelState): WheelState {
    saveState(next)
    return next
  },

  addEntry(name: string): WheelState {
    const state = loadState()
    state.entries.push({ id: makeId(), name, createdAt: Date.now() })
    return host.write(state)
  },

  deleteEntry(id: string): WheelState {
    const state = loadState()
    state.entries = state.entries.filter((e) => e.id !== id)
    return host.write(state)
  },

  addSpin(winner: string): WheelState {
    const state = loadState()
    state.spins.push({ id: makeId(), winner, at: Date.now() })
    return host.write(state)
  },

  clear(): WheelState {
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
export type { WheelEntry, SpinRecord, WheelState }
