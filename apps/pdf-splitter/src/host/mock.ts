// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface PdfOperation {
  id: string
  file: string
  operation: string
  result: string
}

export const STORAGE_KEY = 'lacuna.pdf-splitter.operations'

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
