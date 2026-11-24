import { store, type Item } from './mock'

export type { Item }

export function listItems(): Item[] {
  return store.list()
}

export function addItem(input: { name: string; location: string; value: number }): Item {
  return store.add(input)
}

export function updateItem(id: string, input: { name: string; location: string; value: number }): Item | undefined {
  return store.update(id, input)
}

export function deleteItem(id: string) {
  store.remove(id)
}
