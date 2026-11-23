// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockValue } from '@lacuna/host-mock'
import type { PlanState, PlanStore } from './index'

const KEY = 'lacuna.floor-plan.plan'

const EMPTY: PlanState = { layers: [], rooms: [] }

function isPlan(value: unknown): value is PlanState {
  const v = value as Partial<PlanState>
  return (
    typeof v === 'object' &&
    v !== null &&
    Array.isArray(v.layers) &&
    v.layers.every((l) => typeof l === 'string') &&
    Array.isArray(v.rooms) &&
    v.rooms.every((r) => typeof r === 'string')
  )
}

export const mockStore: PlanStore = (() => {
  const value = createMockValue<PlanState>({
    key: KEY,
    fallback: EMPTY,
    validate: isPlan,
  })
  return {
    read() {
      return value.get()
    },
    write(state: PlanState) {
      value.set(state)
    },
  }
})()
