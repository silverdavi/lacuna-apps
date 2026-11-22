// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMockRecordStore } from '@lacuna/host-mock'

export type AngleMode = 'Degrees' | 'Radians'

export interface CalcState {
  expression: string
  angleMode: AngleMode
}

export interface HistoryItem {
  id: string
  expression: string
  value: number
  savedAt: number
}

const STATE_KEY = 'lacuna.calculator.state'
const HISTORY_KEY = 'lacuna.calculator.history'

export const DEFAULT_STATE: CalcState = {
  expression: '',
  angleMode: 'Degrees',
}

function isState(value: unknown): value is CalcState {
  const v = value as Partial<CalcState> | null
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.expression === 'string' &&
    (v.angleMode === 'Degrees' || v.angleMode === 'Radians')
  )
}

function isHistoryItem(value: unknown): value is HistoryItem {
  const v = value as Partial<HistoryItem> | null
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    typeof v.expression === 'string' &&
    typeof v.value === 'number' &&
    Number.isFinite(v.value) &&
    typeof v.savedAt === 'number'
  )
}

export const historyStore = createMockRecordStore<HistoryItem>({
  key: HISTORY_KEY,
  validate: isHistoryItem,
  idPrefix: 'calc',
})

export function loadState(): CalcState {
  let state: CalcState = { ...DEFAULT_STATE }
  try {
    const raw = window.localStorage.getItem(STATE_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (isState(parsed)) state = parsed
    }
  } catch {
    state = { ...DEFAULT_STATE }
  }
  return state
}

export function saveState(state: CalcState): void {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable; state stays in memory for this session
  }
}

export function listHistory(): HistoryItem[] {
  return historyStore.list()
}

export function addHistory(expression: string, value: number): HistoryItem {
  return historyStore.add({ expression, value, savedAt: Date.now() })
}

export function clearHistory(): void {
  historyStore.clear()
}
