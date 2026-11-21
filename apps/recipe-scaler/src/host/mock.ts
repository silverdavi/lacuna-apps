// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// recipe scaler's ingredients and serving sizes in localStorage so the whole
// app runs offline.
import {
  emptyState,
  loadState,
  saveState,
  type Ingredient,
  type RecipeState,
} from './index'

export const spaceId = 'mock-recipe-scaler'

export const host = {
  read(): RecipeState {
    return loadState()
  },

  write(next: RecipeState): RecipeState {
    saveState(next)
    return next
  },

  addIngredient(name: string, quantity: string, unit: string): RecipeState {
    const state = loadState()
    const ingredient: Ingredient = {
      id: `r-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      name,
      quantity,
      unit,
    }
    const next: RecipeState = {
      ingredients: [...state.ingredients, ingredient],
      originalServings: state.originalServings,
      targetServings: state.targetServings,
    }
    return host.write(next)
  },

  deleteIngredient(id: string): RecipeState {
    const state = loadState()
    const next: RecipeState = {
      ingredients: state.ingredients.filter((i) => i.id !== id),
      originalServings: state.originalServings,
      targetServings: state.targetServings,
    }
    return host.write(next)
  },

  setServings(original: number, target: number): RecipeState {
    const state = loadState()
    const next: RecipeState = {
      ingredients: state.ingredients,
      originalServings: original,
      targetServings: target,
    }
    return host.write(next)
  },

  clear(): RecipeState {
    return host.write(emptyState())
  },
}

export type { Ingredient, RecipeState }
