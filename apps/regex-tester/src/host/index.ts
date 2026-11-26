// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// Regex Tester's working state and pattern library in localStorage so the
// whole app runs offline. Every host call for this app goes through this
// adapter; a real host API takes the same shape, so swapping it here is the
// only change needed.

import {
  loadHistory,
  loadState,
  saveHistory,
  saveState,
  type HistoryEntry,
  type TesterState,
} from './mock'

export const spaceId = 'mock-regex-tester'

export const host = {
  state(): TesterState {
    return loadState()
  },

  saveState(state: TesterState): void {
    saveState(state)
  },

  history(): HistoryEntry[] {
    return loadHistory()
  },

  saveHistory(entries: HistoryEntry[]): void {
    saveHistory(entries)
  },
}

export type { HistoryEntry, TesterState }
