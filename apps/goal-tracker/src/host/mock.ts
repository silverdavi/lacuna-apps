// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// goal-tracker's single record in localStorage (via @lacuna/host-mock) so the
// whole app runs offline.
import {
  emptyState,
  loadState,
  saveState,
  type CheckIn,
  type GoalState,
} from './index'

export const spaceId = 'mock-goal-tracker'

export const host = {
  read(): GoalState {
    return loadState()
  },

  write(next: GoalState): GoalState {
    saveState(next)
    return next
  },

  recordCheckIn(count: number, goal: number, date?: string): GoalState {
    const state = loadState()
    const target = date ?? new Date().toISOString().slice(0, 10)
    const existing = state.checkIns.find((c) => c.date === target)
    if (existing) {
      existing.count = count
      existing.goal = goal
    } else {
      state.checkIns.push({ date: target, count, goal, createdAt: Date.now() })
    }
    return host.write(state)
  },

  clear(): GoalState {
    return host.write(emptyState())
  },

  reset(): void {
    // persistence lives in @lacuna/host-mock; writing the empty state is enough
    saveState(emptyState())
  },
}

export type { CheckIn, GoalState }
