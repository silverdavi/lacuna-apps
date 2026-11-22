// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import {
  DEFAULT_STATE,
  addHistory,
  clearHistory,
  listHistory,
  loadState,
  saveState,
  type AngleMode,
  type CalcState,
  type HistoryItem,
} from './mock'

export type { AngleMode, CalcState, HistoryItem }

export const host = {
  loadState(): CalcState {
    return loadState()
  },
  saveState(state: CalcState): CalcState {
    saveState(state)
    return state
  },
  listHistory(): HistoryItem[] {
    return listHistory()
  },
  addHistory(expression: string, value: number): HistoryItem {
    return addHistory(expression, value)
  },
  clearHistory(): void {
    clearHistory()
  },
  defaultState(): CalcState {
    return { ...DEFAULT_STATE }
  },
}
