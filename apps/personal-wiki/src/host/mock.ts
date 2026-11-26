import { createMockRecordStore } from '@lacuna/host-mock'

export interface Note {
  id: string
  title: string
  content: string
}

const KEY = 'lacuna.personal-wiki.mock.v1'

function isNote(v: unknown): v is Note {
  const n = v as { id?: unknown; title?: unknown; content?: unknown }
  return (
    typeof n.id === 'string' &&
    typeof n.title === 'string' &&
    typeof n.content === 'string'
  )
}

export const store = createMockRecordStore<Note>({
  key: KEY,
  validate: isNote,
})
