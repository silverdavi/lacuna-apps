// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Every host call sits behind this file. In the sandbox the host API does not exist yet,
// so records live in localStorage through @lacuna/host-mock with fictional fixtures only.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Receipt {
  id: string
  merchant: string
  amount: number
  category: string
}

function isReceipt(value: unknown): value is Receipt {
  const v = value as Receipt
  return (
    typeof v?.id === 'string' &&
    typeof v?.merchant === 'string' &&
    typeof v?.amount === 'number' &&
    Number.isFinite(v.amount) &&
    typeof v?.category === 'string'
  )
}

export const receipts = createMockRecordStore<Receipt>({
  key: 'lacuna.receipt-tracker:receipts',
  idPrefix: 'receipt',
  validate: isReceipt,
})

export const settings = createMockValue<{ note: string }>({
  key: 'lacuna.receipt-tracker:settings',
  fallback: { note: '' },
})
