// Space-scoped persistence for the habit heatmap.
// The app keeps everything in the space's mock storage (localStorage) via
// @lacuna/host-mock, so it works with no network. State is rehydrated on load
// and saved on every change.

import { createMockValue } from '@lacuna/host-mock'

export type Habit = {
  id: string
  name: string
  createdAt: number
}

export type HabitState = {
  habits: Habit[]
  completions: string[] // YYYY-MM-DD dates
}

export const emptyState = (): HabitState => ({
  habits: [],
  completions: [],
})

const KEY = 'lacuna.habit-heatmap.state'

function isValidHabitState(v: unknown): v is HabitState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  return (
    (Array.isArray(o.habits) || o.habits === undefined) &&
    (Array.isArray(o.completions) || o.completions === undefined)
  )
}

const store = createMockValue<HabitState>({
  key: KEY,
  fallback: emptyState(),
  validate: isValidHabitState,
})

export function loadState(): HabitState {
  return store.get()
}

export function saveState(state: HabitState): void {
  store.set(state)
}
