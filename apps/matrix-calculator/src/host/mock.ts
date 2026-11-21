// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Local persistence for the matrix calculator session, backed by @lacuna/host-mock.
// The real host API will back this in the sandboxed runtime.
import { createMockValue, type MockValue } from '@lacuna/host-mock'

export type Operation = 'add' | 'multiply'

export type MatrixRecord = {
  rows: number
  cols: number
  values: string[]
}

export type SessionRecord = {
  operation: Operation
  a: MatrixRecord
  b: MatrixRecord
}

const STORAGE_KEY = 'lacuna.matrix-calculator.session'

export const DEFAULT_RECORD: SessionRecord = {
  operation: 'add',
  a: { rows: 2, cols: 2, values: ['1', '2', '3', '4'] },
  b: { rows: 2, cols: 2, values: ['5', '6', '7', '8'] },
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isMatrixRecord(value: unknown): value is MatrixRecord {
  const v = value as Partial<MatrixRecord> | null
  return (
    !!v &&
    typeof v === 'object' &&
    isNumber(v.rows) &&
    v.rows >= 1 &&
    v.rows <= 5 &&
    isNumber(v.cols) &&
    v.cols >= 1 &&
    v.cols <= 5 &&
    Array.isArray(v.values) &&
    v.values.length === v.rows * v.cols &&
    v.values.every((c) => typeof c === 'string')
  )
}

export function isSessionRecord(value: unknown): value is SessionRecord {
  const v = value as Partial<SessionRecord> | null
  return (
    !!v &&
    typeof v === 'object' &&
    (v.operation === 'add' || v.operation === 'multiply') &&
    isMatrixRecord(v.a) &&
    isMatrixRecord(v.b)
  )
}

export const sessionStore: MockValue<SessionRecord> = createMockValue<SessionRecord>({
  key: STORAGE_KEY,
  fallback: DEFAULT_RECORD,
  validate: isSessionRecord,
})
