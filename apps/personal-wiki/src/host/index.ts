import { store, type Note } from './mock'

export type { Note }

export function listNotes(): Note[] {
  return store.list()
}

export function addNote(title: string): Note {
  return store.add({ title, content: '' })
}

export function updateNoteContent(id: string, content: string) {
  store.update(id, { content })
}

export function updateNoteTitle(id: string, title: string) {
  store.update(id, { title })
}

export function deleteNote(id: string) {
  store.remove(id)
}
