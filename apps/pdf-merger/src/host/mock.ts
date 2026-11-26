// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface PdfOperation {
  id: string
  file: string
  operation: string
  result: string
}

export const STORAGE_KEY = 'lacuna.pdf-merger.operations'

const validate = (value: unknown): value is PdfOperation => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<PdfOperation>
  return (
    typeof v.id === 'string' &&
    typeof v.file === 'string' &&
    typeof v.operation === 'string' &&
    typeof v.result === 'string'
  )
}

export function operationsStore() {
  return createMockRecordStore<PdfOperation>({
    key: STORAGE_KEY,
    validate,
    idPrefix: 'op',
  })
}

export const LAST_OPERATION_KEY = 'lacuna.pdf-merger.last-operation'

export function readLastOperation(): string {
  try {
    const raw = window.localStorage.getItem(LAST_OPERATION_KEY)
    if (raw === null) return ''
    const parsed = JSON.parse(raw) as { type?: unknown } | null
    return parsed && typeof parsed.type === 'string' ? parsed.type : ''
  } catch {
    return ''
  }
}

export function writeLastOperation(type: string): void {
  try {
    window.localStorage.setItem(LAST_OPERATION_KEY, JSON.stringify({ type }))
  } catch {
    // Storage may be unavailable; last operation then simply does not persist.
  }
}
