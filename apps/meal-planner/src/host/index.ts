// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Adapter for @lacuna/host-mock: a localStorage-backed record store so planned
// meals survive a reload. All host calls live behind this one file.
import { mealStore, type Day, type Meal } from './mock'

export type { Day, Meal }
export { DAYS } from './mock'

export function listMeals(): Meal[] {
  return mealStore.list()
}

export function addMeal(input: Omit<Meal, 'id'>): Meal {
  return mealStore.add(input)
}

export function removeMeal(id: string): boolean {
  return mealStore.remove(id)
}

export function syncMeals(meals: Array<Omit<Meal, 'id'> & { id: string }>): void {
  mealStore.replaceAll(meals)
}
