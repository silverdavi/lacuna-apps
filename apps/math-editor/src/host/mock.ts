// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/host-mock backed stores for the Math Editor document and history.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Snapshot {
  id: string
  text: string
  ts: number
}

export const documentStore = createMockValue<string>({
  key: 'math-editor:document',
  fallback: '',
  validate: (v): v is string => typeof v === 'string',
})

export const historyStore = createMockRecordStore<Snapshot>({
  key: 'math-editor:history',
  idPrefix: 'snap-',
  validate: (v): v is Snapshot =>
    typeof v === 'object' && v !== null &&
    typeof (v as Record<string, unknown>).id === 'string' &&
    typeof (v as Record<string, unknown>).text === 'string' &&
    typeof (v as Record<string, unknown>).ts === 'number',
})
