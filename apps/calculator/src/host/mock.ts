// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'
import { useLocalRecord } from '@lacuna/use-local-record'

export type AngleMode = 'Degrees' | 'Radians'

export interface CalcState {
  expression: string
  angleMode: AngleMode
}

export interface HistoryItem {
  id: string
  expression: string
  value: number
  mode: AngleMode
  savedAt: number
}

const HISTORY_KEY = 'lacuna.calculator.history'
const STATE_KEY = 'lacuna.calculator.state'

function isHistoryItem(value: unknown): value is HistoryItem {
  const v = value as Partial<HistoryItem> | null
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    typeof v.expression === 'string' &&
    typeof v.value === 'number' &&
    Number.isFinite(v.value) &&
    (v.mode === 'Degrees' || v.mode === 'Radians') &&
    typeof v.savedAt === 'number'
  )
}

function isCalcState(value: unknown): value is CalcState {
  const v = value as Partial<CalcState> | null
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.expression === 'string' &&
    (v.angleMode === 'Degrees' || v.angleMode === 'Radians')
  )
}

export const historyStore = createMockRecordStore<HistoryItem>({
  key: HISTORY_KEY,
  validate: isHistoryItem,
  idPrefix: 'calc',
})

export const stateValue = createMockValue<CalcState>({
  key: STATE_KEY,
  fallback: { expression: '', angleMode: 'Degrees' },
  validate: isCalcState,
})

export function listHistory(): HistoryItem[] {
  return historyStore.list()
}

export function addHistory(expression: string, value: number, mode: AngleMode): HistoryItem {
  return historyStore.add({ expression, value, mode, savedAt: Date.now() })
}

export function removeHistory(id: string): void {
  historyStore.remove(id)
}

export function clearHistory(): void {
  historyStore.clear()
}

export function defaultState(): CalcState {
  return { expression: '', angleMode: 'Degrees' }
}

export function useCalculatorState(): { state: CalcState; setState: (next: CalcState) => void } {
  const record = useLocalRecord<CalcState>({
    key: STATE_KEY,
    version: 1,
    defaultValue: defaultState(),
  })
  return {
    state: record.value,
    setState: (next: CalcState) => record.set(next),
  }
}
