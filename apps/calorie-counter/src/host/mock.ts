// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// calorie-counter's meals in localStorage so the whole app runs offline.
import {
  CATEGORIES,
  emptyState,
  loadState,
  makeId,
  saveState,
  type MealEntry,
  type MealState,
} from './index'

const KEY = 'lacuna.calorie-counter.state'

export const spaceId = 'mock-calorie-counter'

export function isCategory(value: string): boolean {
  return (CATEGORIES as readonly string[]).includes(value)
}

export const host = {
  read(): MealState {
    return { ...loadState(), meals: [...loadState().meals] }
  },

  write(next: MealState): MealState {
    saveState(next)
    return next
  },

  addMeal(name: string, category: string, calories: number): MealState {
    const state = loadState()
    state.meals.push({ id: makeId(), name, category, calories, createdAt: Date.now() })
    return host.write(state)
  },

  deleteMeal(id: string): MealState {
    const state = loadState()
    state.meals = state.meals.filter((m) => m.id !== id)
    return host.write(state)
  },

  clear(): MealState {
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
export type { MealEntry, MealState }
