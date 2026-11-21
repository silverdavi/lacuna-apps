// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// goal-tracker's single record in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  saveState,
  type CheckIn,
  type GoalState,
} from './index'

const KEY = 'lacuna.goal-tracker.state'

export const spaceId = 'mock-goal-tracker'

export function todayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const host = {
  read(): GoalState {
    return loadState()
  },

  write(next: GoalState): GoalState {
    saveState(next)
    return next
  },

  recordCheckIn(count: number, goal: number, date = todayKey(new Date())): GoalState {
    const state = loadState()
    const existing = state.checkIns.find((c) => c.date === date)
    if (existing) {
      existing.count = count
      existing.goal = goal
    } else {
      state.checkIns.push({ date, count, goal, createdAt: Date.now() })
    }
    return host.write(state)
  },

  clear(): GoalState {
    const fresh = emptyState()
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
    return host.write(fresh)
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
export type { CheckIn, GoalState }
