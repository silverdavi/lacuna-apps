// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Local persistence for the tip calculator state, backed by @lacuna/host-mock.
import { createMockValue, type MockValue } from '@lacuna/host-mock'

export interface TipRecord {
  bill: number
  tax: number
  tipPercent: number
  people: number
  paid: Record<string, number>
}

const STORAGE_KEY = 'lacuna.tip-calculator.state'

export const DEFAULT_RECORD: TipRecord = {
  bill: 0,
  tax: 0,
  tipPercent: 0,
  people: 2,
  paid: {},
}

function isTipRecord(value: unknown): value is TipRecord {
  const v = value as Partial<TipRecord> | null
  return (
    !!v &&
    typeof v === 'object' &&
    typeof v.bill === 'number' &&
    typeof v.tax === 'number' &&
    typeof v.tipPercent === 'number' &&
    typeof v.people === 'number' &&
    typeof v.paid === 'object' &&
    v.paid !== null
  )
}

export const tipStore: MockValue<TipRecord> = createMockValue<TipRecord>({
  key: STORAGE_KEY,
  fallback: DEFAULT_RECORD,
  validate: isTipRecord,
})
