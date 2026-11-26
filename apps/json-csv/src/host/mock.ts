// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface HistoryEntry {
  id: string
  label: string
  inputText: string
  outputText: string
  timestamp: number
}

const KEY = 'lacuna.json-csv.mock.v1'

function isHistoryEntry(v: unknown): v is HistoryEntry {
  const e = v as { id?: unknown; label?: unknown; inputText?: unknown; outputText?: unknown; timestamp?: unknown }
  return (
    typeof e.id === 'string' &&
    typeof e.label === 'string' &&
    typeof e.inputText === 'string' &&
    typeof e.outputText === 'string' &&
    typeof e.timestamp === 'number'
  )
}

export const store = createMockRecordStore<HistoryEntry>({
  key: KEY,
  validate: isHistoryEntry,
})
