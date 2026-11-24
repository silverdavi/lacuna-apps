// Adapter for @lacuna/host-mock: localStorage-backed stores so point-of-sale
// data survives a reload. All persistence lives behind this one file.
import { createMockRecordStore } from '@lacuna/host-mock'

export type SaleLine = {
  item: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
}

export type Sale = {
  id: string
  date: string
  lines: SaleLine[]
  total: number
}

export type InventoryItem = {
  id: string
  name: string
  stock: number
  price: number
}

export const salesStore = createMockRecordStore<Sale>({
  key: 'lacuna.point-of-sale.sales',
  idPrefix: 'S-',
  validate: (v: unknown): v is Sale => {
    const s = v as Partial<Sale> | null
    return (
      !!s &&
      typeof s.id === 'string' &&
      typeof s.date === 'string' &&
      Array.isArray(s.lines) &&
      typeof s.total === 'number'
    )
  },
})

export const inventoryStore = createMockRecordStore<InventoryItem>({
  key: 'lacuna.point-of-sale.inventory',
  idPrefix: 'inv-',
  validate: (v: unknown): v is InventoryItem => {
    const i = v as Partial<InventoryItem> | null
    return (
      !!i &&
      typeof i.id === 'string' &&
      typeof i.name === 'string' &&
      typeof i.stock === 'number' &&
      typeof i.price === 'number'
    )
  },
})
