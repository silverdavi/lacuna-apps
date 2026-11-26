// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// guitar-tuner's entries in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  saveState,
  type TuningEntry,
  type TuningState,
} from './index'

const KEY = 'lacuna.guitar-tuner.state'

export const spaceId = 'mock-guitar-tuner'

export const host = {
  read(): TuningState {
    const state = loadState()
    return { entries: [...state.entries].sort((a, b) => a.createdAt - b.createdAt) }
  },

  write(next: TuningState): TuningState {
    saveState(next)
    return next
  },

  addEntry(entry: Omit<TuningEntry, 'id' | 'createdAt'>): TuningState {
    const state = loadState()
    state.entries.push({ ...entry, id: makeId(), createdAt: Date.now() })
    return host.write(state)
  },

  deleteEntry(id: string): TuningState {
    const state = loadState()
    state.entries = state.entries.filter((e) => e.id !== id)
    return host.write(state)
  },

  clear(): TuningState {
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
export type { TuningEntry, TuningState }
