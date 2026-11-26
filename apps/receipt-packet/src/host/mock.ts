import { createMockRecordStore } from '@lacuna/host-mock'

export type Receipt = {
  id: string
  label: string
  date: string
  amount: string
  mime: string
  base64: string
  rotation: number
}

export const receiptStore = createMockRecordStore<Receipt>({
  key: 'receipt-packet.receipts.v1',
  validate: (v: unknown): v is Receipt =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Receipt).id === 'string' &&
    typeof (v as Receipt).label === 'string' &&
    typeof (v as Receipt).date === 'string' &&
    typeof (v as Receipt).amount === 'string' &&
    typeof (v as Receipt).mime === 'string' &&
    typeof (v as Receipt).base64 === 'string' &&
    typeof (v as Receipt).rotation === 'number',
})
