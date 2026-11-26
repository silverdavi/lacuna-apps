// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export type Day = (typeof DAYS)[number]

export interface Meal {
  id: string
  /** Human-readable meal name. */
  name: string
  /** Day of the week the meal is planned for. */
  day: Day
  /** Comma-separated ingredient names. */
  ingredients: string
}

function isDay(v: unknown): v is Day {
  return typeof v === 'string' && (DAYS as readonly string[]).includes(v)
}

export const mealStore = createMockRecordStore<Meal>({
  key: 'lacuna.meal-planner.meals',
  idPrefix: 'meal',
  validate: (v: unknown): v is Meal => {
    const m = v as Partial<Meal> | null
    return (
      !!m &&
      typeof m.id === 'string' &&
      typeof m.name === 'string' &&
      isDay(m.day) &&
      typeof m.ingredients === 'string'
    )
  },
})
