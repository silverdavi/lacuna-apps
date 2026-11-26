import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type NoteRecord = {
  id: string
  title: string
  content: string
  archived: boolean
  createdAt: number
  updatedAt: number
}

export const noteStore = createMockRecordStore<NoteRecord>({
  key: 'lacuna.notes-app.notes',
  idPrefix: 'note',
  validate: (v: unknown): v is NoteRecord => {
    const n = v as Partial<NoteRecord> | null
    return (
      !!n &&
      typeof n.id === 'string' &&
      typeof n.title === 'string' &&
      typeof n.content === 'string' &&
      typeof n.archived === 'boolean' &&
      typeof n.createdAt === 'number' &&
      typeof n.updatedAt === 'number'
    )
  },
})

export type NotePrefs = {
  showArchived: boolean
}

export const notePrefs = createMockValue<NotePrefs>({
  key: 'lacuna.notes-app.prefs',
  fallback: { showArchived: false },
  validate: (v: unknown): v is NotePrefs =>
    !!v && typeof (v as { showArchived?: unknown }).showArchived === 'boolean',
})
