// Space-scoped persistence for the recipe scaler.
// The app keeps every ingredient and the serving sizes in the space's mock
// storage (localStorage), so it works with no network. State is rehydrated on
// load and saved on every change.
import { createMockValue } from '@lacuna/host-mock'

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

function isRecipeState(value: unknown): value is RecipeState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (!Array.isArray(v.ingredients)) return false
  if (typeof v.originalServings !== 'number' || !Number.isFinite(v.originalServings) || v.originalServings <= 0) return false
  if (typeof v.targetServings !== 'number' || !Number.isFinite(v.targetServings) || v.targetServings <= 0) return false
  return (v.ingredients as unknown[]).every((i) => {
    if (!i || typeof i !== 'object') return false
    const ing = i as Record<string, unknown>
    return (
      typeof ing.name === 'string' &&
      ing.name.trim() !== '' &&
      typeof ing.quantity === 'string' &&
      ing.quantity.trim() !== '' &&
      typeof ing.unit === 'string' &&
      ing.unit.trim() !== ''
    )
  })
}

function sanitize(state: RecipeState): RecipeState {
  const ingredients = state.ingredients.map((i) => ({
    id: typeof i.id === 'string' && i.id ? i.id : `r-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
  }))
  return {
    ingredients,
    originalServings: state.originalServings,
    targetServings: state.targetServings,
  }
}

const store = createMockValue<RecipeState>({
  key: KEY,
  fallback: emptyState(),
  validate: isRecipeState,
})

export function loadState(): RecipeState {
  const raw = store.get()
  return sanitize(raw)
}

export function saveState(state: RecipeState): void {
  store.set(sanitize(state))
}

export { KEY }
