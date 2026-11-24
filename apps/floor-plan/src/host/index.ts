// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
export interface PlanState {
  layers: string[]
  rooms: string[]
}

export interface PlanStore {
  read(): PlanState
  write(state: PlanState): void
}
