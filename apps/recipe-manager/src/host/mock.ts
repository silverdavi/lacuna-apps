import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'

export type RecipeData = {
  name: string
  servings: string
  notes: string
  tags: string[]
}

export type Recipe = RecipeData & { id: string }

const store: MockRecordStore<Recipe> = createMockRecordStore<Recipe>({
  key: 'lacuna.recipe-manager.recipes',
  idPrefix: 'rc',
  validate: (v: unknown): v is Recipe => {
    const r = v as Partial<Recipe> | null
    return (
      !!r &&
      typeof r.id === 'string' &&
      typeof r.name === 'string' &&
      typeof r.servings === 'string' &&
      typeof r.notes === 'string' &&
      Array.isArray(r.tags)
    )
  },
})

export function loadRecipes(): Recipe[] {
  return store.list()
}

export function saveRecipes(recipes: Recipe[]): void {
  store.replaceAll(recipes)
}
