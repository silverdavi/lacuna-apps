// Space-scoped persistence for the time tracker.
// The app keeps every logged session in the space's mock storage (localStorage)
// via @lacuna/host-mock, so it works with no network. State is rehydrated on
// load and saved on every change.

import { createMockValue } from '@lacuna/host-mock'

export type Session = {
  id: string
  task: string
  durationMs: number
  loggedAt: number
}

export type TrackerState = {
  sessions: Session[]
}

export const emptyState = (): TrackerState => ({
  sessions: [],
})

const KEY = 'lacuna.time-tracker.state'

function isValidTrackerState(v: unknown): v is TrackerState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  if (o.sessions === undefined) return true
  if (!Array.isArray(o.sessions)) return false
  return o.sessions.every(
    (s) =>
      s &&
      typeof s === 'object' &&
      typeof (s as Record<string, unknown>).id === 'string' &&
      typeof (s as Record<string, unknown>).task === 'string' &&
      typeof (s as Record<string, unknown>).durationMs === 'number' &&
      typeof (s as Record<string, unknown>).loggedAt === 'number',
  )
}

const store = createMockValue<TrackerState>({
  key: KEY,
  fallback: emptyState(),
  validate: isValidTrackerState,
})

export function loadState(): TrackerState {
  return store.get()
}

export function saveState(state: TrackerState): void {
  store.set(state)
}

export const host = {
  read(): TrackerState {
    return loadState()
  },

  write(next: TrackerState): TrackerState {
    saveState(next)
    return next
  },

  addSession(task: string, durationMs: number, now = Date.now()): TrackerState {
    const state = loadState()
    const session: Session = {
      id: `s-${now}-${state.sessions.length}`,
      task: task.trim() || 'Default Task',
      durationMs,
      loggedAt: now,
    }
    return host.write({ ...state, sessions: [session, ...state.sessions] })
  },

  removeSession(id: string): TrackerState {
    const state = loadState()
    return host.write({ ...state, sessions: state.sessions.filter((s) => s.id !== id) })
  },

  reset(): void {
    saveState(emptyState())
  },
}
