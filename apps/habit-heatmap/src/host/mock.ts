// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// habit heatmap state in localStorage (via @lacuna/host-mock) so the whole
// app runs offline.
import { emptyState, loadState, saveState, type Habit, type HabitState } from './index'

export const spaceId = 'mock-habit-heatmap'

export const host = {
  read(): HabitState {
    return loadState()
  },

  write(next: HabitState): HabitState {
    saveState(next)
    return next
  },

  addHabit(name: string, now = Date.now()): HabitState {
    const state = loadState()
    const habit: Habit = { id: `h-${now}`, name: name.trim() || 'Habit', createdAt: now }
    return host.write({ ...state, habits: [...state.habits, habit] })
  },

  removeHabit(id: string): HabitState {
    const state = loadState()
    return host.write({ ...state, habits: state.habits.filter((h) => h.id !== id) })
  },

  toggleCompletion(date: string): HabitState {
    const state = loadState()
    const has = state.completions.includes(date)
    return host.write({
      ...state,
      completions: has ? state.completions.filter((d) => d !== date) : [...state.completions, date],
    })
  },

  reset(): void {
    saveState(emptyState())
  },
}

export type { Habit, HabitState }
