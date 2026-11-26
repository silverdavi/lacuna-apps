// Space-scoped persistence for the reaction-time app.
// The app keeps everything in the space's mock storage (localStorage) via
// @lacuna/host-mock, so it works with no network. State is rehydrated on load
// and saved on every change.

import { createMockValue } from '@lacuna/host-mock'

export type ReactionAttempt = {
  id: string
  time: number // reaction time in ms
  date: string // YYYY-MM-DD
  createdAt: number
}

export type ReactionState = {
  attempts: ReactionAttempt[]
}

export const emptyState = (): ReactionState => ({
  attempts: [],
})

const KEY = 'lacuna.reaction-time.state'

function isValidReactionState(v: unknown): v is ReactionState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  if (!Array.isArray(o.attempts)) return false
  return o.attempts.every(
    (a) =>
      typeof a === 'object' &&
      a !== null &&
      typeof (a as ReactionAttempt).time === 'number' &&
      typeof (a as ReactionAttempt).date === 'string' &&
      typeof (a as ReactionAttempt).createdAt === 'number' &&
      typeof (a as ReactionAttempt).id === 'string',
  )
}

const store = createMockValue<ReactionState>({
  key: KEY,
  fallback: emptyState(),
  validate: isValidReactionState,
})

export function loadState(): ReactionState {
  return store.get()
}

export function saveState(state: ReactionState): void {
  store.set(state)
}
