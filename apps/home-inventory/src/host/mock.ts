import { createMockRecordStore } from '@lacuna/host-mock'

export interface Item {
  id: string
  name: string
  location: string
  value: number
}

const KEY = 'lacuna.home-inventory.mock.v1'

function isItem(v: unknown): v is Item {
  const i = v as { id?: unknown; name?: unknown; location?: unknown; value?: unknown }
  return (
    typeof i.id === 'string' &&
    typeof i.name === 'string' &&
    typeof i.location === 'string' &&
    typeof i.value === 'number' &&
    Number.isFinite(i.value)
  )
}

export const store = createMockRecordStore<Item>({
  key: KEY,
  validate: isItem,
})
