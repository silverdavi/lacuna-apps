// Space-scoped persistence for the recipe scaler.
// The app keeps every ingredient and the serving sizes in the space's mock
// storage (localStorage), so it works with no network. State is rehydrated on
// load and saved on every change.

export type Ingredient = {
  id: string
  name: string
  quantity: string // e.g. "1 1/2"
  unit: string // e.g. "cups"
}

export type RecipeState = {
  ingredients: Ingredient[]
  originalServings: number
  targetServings: number
}

export const emptyState = (): RecipeState => ({
  ingredients: [],
  originalServings: 1,
  targetServings: 1,
})

const KEY = 'lacuna.recipe-scaler.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `r-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function loadState(): RecipeState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyState()
    const ingredients = Array.isArray(parsed.ingredients)
      ? parsed.ingredients
          .filter(
            (i: unknown) =>
              i &&
              typeof i === 'object' &&
              typeof (i as Ingredient).name === 'string' &&
              (i as Ingredient).name.trim() !== '' &&
              typeof (i as Ingredient).quantity === 'string' &&
              (i as Ingredient).quantity.trim() !== '' &&
              typeof (i as Ingredient).unit === 'string' &&
              (i as Ingredient).unit.trim() !== '',
          )
          .map((i: Ingredient) => ({
            id: typeof i.id === 'string' && i.id ? i.id : makeId(),
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          }))
      : []
    const originalServings =
      typeof parsed.originalServings === 'number' &&
      Number.isFinite(parsed.originalServings) &&
      parsed.originalServings > 0
        ? parsed.originalServings
        : 1
    const targetServings =
      typeof parsed.targetServings === 'number' &&
      Number.isFinite(parsed.targetServings) &&
      parsed.targetServings > 0
        ? parsed.targetServings
        : 1
    return { ingredients, originalServings, targetServings }
  } catch {
    return emptyState()
  }
}

export function saveState(state: RecipeState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage may be unavailable (private mode, quota); the app keeps working in memory
  }
}
