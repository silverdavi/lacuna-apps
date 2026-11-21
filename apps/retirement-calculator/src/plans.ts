// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export type SavedPlan = {
  id: string
  title: string
  ages: string
  returnPct: string
  projected: number
}

const KEY = 'lacuna.retirement-calculator.plans'

function isPlan(value: unknown): value is SavedPlan {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.ages === 'string' &&
    typeof v.returnPct === 'string' &&
    typeof v.projected === 'number' &&
    Number.isFinite(v.projected)
  )
}

const store = createMockRecordStore<SavedPlan>({ key: KEY, validate: isPlan, idPrefix: 'plan' })

export function listPlans(): SavedPlan[] {
  return store.list()
}

export function addPlan(plan: Omit<SavedPlan, 'id'>): SavedPlan {
  return store.add(plan)
}

export function removePlan(id: string): boolean {
  return store.remove(id)
}
