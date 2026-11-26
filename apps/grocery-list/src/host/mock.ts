// Adapter for @lacuna/host-mock: a localStorage-backed record store so grocery
// items survive a reload. All host calls live behind this one file.
import { createMockRecordStore } from '@lacuna/host-mock'

export type GroceryItem = {
  id: string
  name: string
  quantity: number
  done: boolean
}

export const groceryStore = createMockRecordStore<GroceryItem>({
  key: 'lacuna.grocery-list.items',
  idPrefix: 'gro',
  validate: (v: unknown): v is GroceryItem => {
    const i = v as Partial<GroceryItem> | null
    return (
      !!i &&
      typeof i.id === 'string' &&
      typeof i.name === 'string' &&
      typeof i.quantity === 'number' &&
      typeof i.done === 'boolean'
    )
  },
})
