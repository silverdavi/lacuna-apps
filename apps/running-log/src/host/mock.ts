// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// running-log's runs in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  saveState,
  type Run,
  type RunState,
} from './index'

const KEY = 'lacuna.running-log.state'

export const spaceId = 'mock-running-log'

function byDate(a: Run, b: Run): number {
  const d = a.date.localeCompare(b.date)
  return d !== 0 ? d : a.createdAt - b.createdAt
}

export const host = {
  read(): RunState {
    return { ...loadState(), runs: [...loadState().runs].sort(byDate) }
  },

  write(next: RunState): RunState {
    saveState(next)
    return next
  },

  addRun(date: string, distance: number, time: number): RunState {
    const state = loadState()
    state.runs.push({ id: makeId(), date, distance, time, createdAt: Date.now() })
    return host.write(state)
  },

  deleteRun(id: string): RunState {
    const state = loadState()
    state.runs = state.runs.filter((r) => r.id !== id)
    return host.write(state)
  },

  clear(): RunState {
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
export type { Run, RunState }
