// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// reaction-time state in localStorage (via @lacuna/host-mock) so the whole
// app runs offline.

import { emptyState, loadState, saveState, type ReactionAttempt, type ReactionState } from './index'

export const spaceId = 'mock-reaction-time'

export const host = {
  read(): ReactionState {
    return loadState()
  },

  write(next: ReactionState): ReactionState {
    saveState(next)
    return next
  },

  addAttempt(time: number, date: string, now = Date.now()): ReactionState {
    const state = loadState()
    const attempt: ReactionAttempt = {
      id: `rt-${now}`,
      time,
      date,
      createdAt: now,
    }
    return host.write({ attempts: [...state.attempts, attempt] })
  },

  removeAttempt(id: string): ReactionState {
    const state = loadState()
    return host.write({
      attempts: state.attempts.filter((a) => a.id !== id),
    })
  },

  reset(): void {
    saveState(emptyState())
  },
}

export type { ReactionAttempt, ReactionState }
