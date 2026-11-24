// Mock space storage for the pomodoro timer. Lacuna spaces are the unit of
// storage; the mock keeps sessions and settings in localStorage via
// @lacuna/host-mock so the whole app works offline.
import { createMockValue } from '@lacuna/host-mock'

export type Session = {
  id: string
  phase: 'Focus' | 'Break'
  seconds: number
  completedAt: string // ISO timestamp
}

export type TimerState = {
  sessions: Session[]
}

export const emptyState = (): TimerState => ({ sessions: [] })

const KEY = 'lacuna.pomodoro-timer.state'

function isValid(v: unknown): v is TimerState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  if (!Array.isArray(o.sessions)) return false
  return o.sessions.every(
    (s) =>
      s &&
      typeof s === 'object' &&
      typeof (s as Session).id === 'string' &&
      ((s as Session).phase === 'Focus' || (s as Session).phase === 'Break') &&
      typeof (s as Session).seconds === 'number' &&
      typeof (s as Session).completedAt === 'string',
  )
}

const store = createMockValue<TimerState>({
  key: KEY,
  fallback: emptyState(),
  validate: isValid,
})

export function loadState(): TimerState {
  return store.get()
}

export function saveState(state: TimerState): void {
  store.set(state)
}

export const host = {
  read(): TimerState {
    return loadState()
  },

  write(next: TimerState): TimerState {
    saveState(next)
    return next
  },

  reset(): void {
    saveState(emptyState())
  },
}
