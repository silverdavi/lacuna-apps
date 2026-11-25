// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMockRecordStore } from '@lacuna/host-mock'

export type Operator = '+' | '×' | '÷'

export interface HistoryItem {
  id: string
  expression: string
  result: string
  savedAt: number
}

const HISTORY_KEY = 'lacuna.fraction-calculator.history'

function isHistoryItem(value: unknown): value is HistoryItem {
  const v = value as Partial<HistoryItem> | null
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    typeof v.expression === 'string' &&
    typeof v.result === 'string' &&
    typeof v.savedAt === 'number'
  )
}

export const historyStore = createMockRecordStore<HistoryItem>({
  key: HISTORY_KEY,
  validate: isHistoryItem,
  idPrefix: 'frac',
})

export function listHistory(): HistoryItem[] {
  return historyStore.list()
}

export function addHistory(expression: string, result: string): HistoryItem {
  return historyStore.add({ expression, result, savedAt: Date.now() })
}

export function removeHistory(id: string): void {
  historyStore.remove(id)
}

export function clearHistory(): void {
  historyStore.clear()
}
