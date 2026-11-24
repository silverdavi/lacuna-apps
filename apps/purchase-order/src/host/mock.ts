import { createMockRecordStore } from '@lacuna/host-mock'

export interface LineItemRecord {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxPct: number
}

export interface OrderRecord {
  id: string
  vendor: string
  orderDate: string
  lineItems: LineItemRecord[]
}

export function isLineItem(v: unknown): v is LineItemRecord {
  const o = v as Record<string, unknown>
  return (
    typeof o?.id === 'string' &&
    typeof o?.description === 'string' &&
    typeof o?.quantity === 'number' &&
    typeof o?.unitPrice === 'number' &&
    typeof o?.discountPct === 'number' &&
    typeof o?.taxPct === 'number'
  )
}

export function isOrder(v: unknown): v is OrderRecord {
  const o = v as Record<string, unknown>
  return (
    typeof o?.id === 'string' &&
    typeof o?.vendor === 'string' &&
    typeof o?.orderDate === 'string' &&
    Array.isArray(o?.lineItems) &&
    o.lineItems.every(isLineItem)
  )
}

export const orderStore = createMockRecordStore<OrderRecord>({
  key: 'lacuna.purchase-order.orders',
  validate: isOrder,
  idPrefix: 'po',
})
