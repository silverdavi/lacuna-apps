// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// Markdown table app's source text and its saved snapshots in localStorage so
// a session survives a reload. Every host call for this app goes through this
// adapter; a real host API takes the same shape, so swapping it here is the
// only change needed.

import {
  clearSnapshots,
  clearText,
  loadSnapshots,
  loadText,
  pushSnapshot,
  removeSnapshot,
  replaceSnapshot,
  saveText,
  type Snapshot,
} from './mock'

export const spaceId = 'mock-markdown-table'

export const host = {
  read(): string {
    return loadText()
  },

  write(text: string): string {
    return saveText(text)
  },

  clear(): string {
    return clearText()
  },

  snapshots(): Snapshot[] {
    return loadSnapshots()
  },

  save(text: string, rows: number, columns: number): Snapshot[] {
    return pushSnapshot({ text, rows, columns, at: Date.now() })
  },

  update(id: string, text: string): Snapshot[] {
    return replaceSnapshot(id, text)
  },

  remove(id: string): Snapshot[] {
    return removeSnapshot(id)
  },

  clearSnapshots(): Snapshot[] {
    return clearSnapshots()
  },
}

export type { Snapshot }
