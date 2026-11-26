// Space-scoped persistence for the goal tracker.
// The app keeps everything in the space's mock storage (localStorage) via
// @lacuna/host-mock, so it works with no network. State is rehydrated on load
// and saved on every change.

import { createMockValue } from '@lacuna/host-mock'

export type CheckIn = {
  date: string // YYYY-MM-DD
  count: number
  goal: number
  createdAt: number
}

export type GoalState = {
  goalName: string
  dailyGoal: number
  checkIns: CheckIn[]
}

export const emptyState = (): GoalState => ({
  goalName: 'My goal',
  dailyGoal: 1,
  checkIns: [],
})

const KEY = 'lacuna.goal-tracker.state'

function isValidGoalState(v: unknown): v is GoalState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  return (
    (typeof o.goalName === 'string' || o.goalName === undefined) &&
    (typeof o.dailyGoal === 'number' || o.dailyGoal === undefined) &&
    (Array.isArray(o.checkIns) || o.checkIns === undefined)
  )
}

const store = createMockValue<GoalState>({
  key: KEY,
  fallback: emptyState(),
  validate: isValidGoalState,
})

export function loadState(): GoalState {
  return store.get()
}

export function saveState(state: GoalState): void {
  store.set(state)
}
