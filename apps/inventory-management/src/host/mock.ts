// localStorage-backed mock store for the inventory-management app.
// Built on @lacuna/host-mock so corrupt/missing storage degrades safely.

import { createMockRecordStore } from '@lacuna/host-mock'

type Direction = 'in' | 'out'
export interface Item {
  id: string
  name: string
  quantity: number
  category: string
  updatedAt: number
}
export interface Movement {
  id: string
  itemId: string
  itemName: string
  direction: Direction
  quantity: number
  at: number
}

const itemsStore = createMockRecordStore<Item>({
  key: 'lacuna.inventory.items',
  idPrefix: 'i-',
  validate: (v): v is Item => {
    if (typeof v !== 'object' || v === null) return false
    const o = v as Record<string, unknown>
    return (
      typeof o.id === 'string' &&
      typeof o.name === 'string' &&
      typeof o.quantity === 'number' &&
      typeof o.category === 'string'
    )
  },
})

const movementsStore = createMockRecordStore<Movement>({
  key: 'lacuna.inventory.movements',
  idPrefix: 'm-',
  validate: (v): v is Movement => {
    if (typeof v !== 'object' || v === null) return false
    const o = v as Record<string, unknown>
    return (
      typeof o.id === 'string' &&
      typeof o.itemId === 'string' &&
      typeof o.itemName === 'string' &&
      typeof o.direction === 'string' &&
      typeof o.quantity === 'number'
    )
  },
})

export function createInventoryStore() {
  return {
    getItems(): Item[] {
      return itemsStore.list()
    },
    addItem(name: string, quantity: number, category: string): Item {
      return itemsStore.add({
        name,
        quantity,
        category,
        updatedAt: Date.now(),
      })
    },
    renameItem(id: string, name: string): Item | null {
      const updated = itemsStore.update(id, { name, updatedAt: Date.now() })
      return updated ?? null
    },
    applyMovement(
      itemId: string,
      direction: Direction,
      quantity: number,
    ): { item: Item | null; movement: Movement | null } {
      const item = itemsStore.get(itemId)
      if (!item || quantity <= 0) return { item: null, movement: null }
      const nextQuantity =
        direction === 'in'
          ? item.quantity + quantity
          : Math.max(0, item.quantity - quantity)
      itemsStore.update(itemId, {
        quantity: nextQuantity,
        updatedAt: Date.now(),
      })
      const movement = movementsStore.add({
        itemId: item.id,
        itemName: item.name,
        direction,
        quantity,
        at: Date.now(),
      })
      return {
        item: { ...item, quantity: nextQuantity, updatedAt: Date.now() },
        movement,
      }
    },
    deleteItem(id: string): Item[] {
      itemsStore.remove(id)
      const removed = movementsStore
        .list()
        .filter((m) => m.itemId !== id)
      movementsStore.replaceAll(removed)
      return itemsStore.list()
    },
    getMovements(): Movement[] {
      const list = movementsStore.list()
      return [...list].sort((a, b) => b.at - a.at)
    },
  }
}

export const store = createInventoryStore()
