// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// savings-goal state in localStorage so the whole app runs offline.
import {
  emptyState,
  loadState,
  makeId,
  savedOf,
  saveState,
  type Goal,
  type SavingsState,
} from './index'

const KEY = 'lacuna.savings-goal.state'

export const spaceId = 'mock-savings-goal'

export const host = {
  read(): SavingsState {
    return loadState()
  },

  write(next: SavingsState): SavingsState {
    saveState(next)
    return next
  },

  addGoal(name: string, target: number, deadline: string): SavingsState {
    const state = loadState()
    state.goals.push({
      id: makeId(),
      name: name.trim(),
      target,
      deadline,
      deposits: [],
      createdAt: Date.now(),
    })
    return host.write(state)
  },

  addDeposit(goalId: string, amount: number, date: string): SavingsState {
    const state = loadState()
    const goal = state.goals.find((g) => g.id === goalId)
    if (goal) {
      goal.deposits.push({ id: makeId(), amount, date, createdAt: Date.now() })
      goal.deposits.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    }
    return host.write(state)
  },

  deleteGoal(id: string): SavingsState {
    const state = loadState()
    state.goals = state.goals.filter((g) => g.id !== id)
    return host.write(state)
  },

  clear(): SavingsState {
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

export { KEY, savedOf }
export type { Goal, SavingsState }
