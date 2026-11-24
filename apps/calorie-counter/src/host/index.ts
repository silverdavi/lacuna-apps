// Space-scoped persistence for the calorie counter, backed by @lacuna/host-mock.
// The app keeps every meal in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type MealEntry = {
  id: string
  name: string
  category: string
  calories: number
  date: string // YYYY-MM-DD
  createdAt: number
}

export type MealState = {
  meals: MealEntry[]
}

export const emptyState = (): MealState => ({ meals: [] })

export const KEY = 'lacuna.calorie-counter.state'

export const CATEGORIES: string[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isMealEntry(value: unknown): value is MealEntry {
  const e = value as MealEntry
  return (
    e != null &&
    typeof e === 'object' &&
    typeof e.name === 'string' &&
    e.name.length > 0 &&
    typeof e.category === 'string' &&
    e.category.length > 0 &&
    Number.isFinite(e.calories) &&
    e.calories > 0 &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date)
  )
}

const store = createMockRecordStore<MealEntry>({
  key: KEY,
  idPrefix: 'c-',
  validate: isMealEntry,
})

export function loadState(): MealState {
  const meals = store
    .list()
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      calories: Math.round(e.calories),
      date: e.date,
      createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  return { meals }
}

export function saveState(state: MealState): void {
  store.replaceAll(state.meals)
}
