// Adapter for @lacuna/host-mock: a localStorage-backed record store so outline
// items survive a reload. All host calls live behind this one file.
import { createMockRecordStore } from '@lacuna/host-mock'

export type OutlineItem = {
  id: string
  text: string
  level: number
  order: number
}

export function isOutlineItem(value: unknown): value is OutlineItem {
  const i = value as Partial<OutlineItem> | null
  return (
    !!i &&
    typeof i.id === 'string' &&
    typeof i.text === 'string' &&
    typeof i.level === 'number' &&
    typeof i.order === 'number'
  )
}

export const outlineStore = createMockRecordStore<OutlineItem>({
  key: 'lacuna.outliner.items',
  idPrefix: 'out',
  validate: isOutlineItem,
})
