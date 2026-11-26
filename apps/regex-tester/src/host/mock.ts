// Space-scoped persistence for the Regex Tester.
// The current pattern, flags, and sample text plus the library of saved
// patterns are kept in the space's mock storage (localStorage) so the app
// works offline. State is rehydrated on load and saved on change.

import { createMockValue } from '@lacuna/host-mock'

export interface HistoryEntry {
  pattern: string
  flags: string
  matches: number
}

export interface TesterState {
  pattern: string
  flags: string
  text: string
}

const STATE_KEY = 'lacuna.regex-tester.state'
const HISTORY_KEY = 'lacuna.regex-tester.history'

function isState(v: unknown): v is TesterState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.pattern === 'string' &&
    typeof s.flags === 'string' &&
    typeof s.text === 'string'
  )
}

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return (
    typeof e.pattern === 'string' &&
    typeof e.flags === 'string' &&
    typeof e.matches === 'number'
  )
}

function isHistory(v: unknown): v is HistoryEntry[] {
  return Array.isArray(v) && v.every(isHistoryEntry)
}

const stateStore = createMockValue<TesterState>({
  key: STATE_KEY,
  fallback: { pattern: 'world', flags: 'g', text: '' },
  validate: isState,
})

const historyStore = createMockValue<HistoryEntry[]>({
  key: HISTORY_KEY,
  fallback: [],
  validate: isHistory,
})

export function loadState(): TesterState {
  return stateStore.get()
}

export function saveState(state: TesterState): void {
  stateStore.set(state)
}

export function loadHistory(): HistoryEntry[] {
  return historyStore.get()
}

export function saveHistory(entries: HistoryEntry[]): void {
  historyStore.set(entries)
}
