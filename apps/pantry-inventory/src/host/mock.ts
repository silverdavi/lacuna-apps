import { createMockRecordStore } from '@lacuna/host-mock'

export type PantryItem = {
  id: string
  name: string
  quantity: number
  unit: string
  expiration: string
}

export const pantryStore = createMockRecordStore<PantryItem>({
  key: 'lacuna.pantry-inventory.items',
  idPrefix: 'pan',
  validate: (v: unknown): v is PantryItem => {
    const i = v as Partial<PantryItem> | null
    return (
      !!i &&
      typeof i.id === 'string' &&
      typeof i.name === 'string' &&
      typeof i.quantity === 'number' &&
      typeof i.unit === 'string' &&
      typeof i.expiration === 'string'
    )
  },
})
