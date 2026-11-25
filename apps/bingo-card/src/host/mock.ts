// Adapter for @lacuna/host-mock: a localStorage-backed record store so saved
// bingo cards survive a reload. All host calls live behind this one file.
import { createMockRecordStore } from '@lacuna/host-mock'

export type SavedCard = {
  id: string
  name: string
  card: string[]
  size: number
}

export const cardStore = createMockRecordStore<SavedCard>({
  key: 'lacuna.bingo-card.saved',
  idPrefix: 'card',
  validate: (v: unknown): v is SavedCard => {
    const i = v as Partial<SavedCard> | null
    return (
      !!i &&
      typeof i.id === 'string' &&
      typeof i.name === 'string' &&
      Array.isArray(i.card) &&
      i.card.every((c) => typeof c === 'string') &&
      typeof i.size === 'number'
    )
  },
})
