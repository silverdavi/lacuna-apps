// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import {
  addHistory,
  clearHistory,
  defaultState,
  listHistory,
  removeHistory,
  useCalculatorState,
  type AngleMode,
  type CalcState,
  type HistoryItem,
} from './mock'

export type { AngleMode, CalcState, HistoryItem }
export { useCalculatorState }

export const host = {
  listHistory(): HistoryItem[] {
    return listHistory()
  },
  addHistory(expression: string, value: number, mode: AngleMode): HistoryItem {
    return addHistory(expression, value, mode)
  },
  removeHistory(id: string): void {
    removeHistory(id)
  },
  clearHistory(): void {
    clearHistory()
  },
  defaultState(): CalcState {
    return defaultState()
  },
}
