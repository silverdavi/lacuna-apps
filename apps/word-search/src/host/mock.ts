import { createMockRecordStore } from '@lacuna/host-mock'

const KEY = 'lacuna.word-search.save'

export interface PuzzleRecord {
  id: string
  kind: 'puzzle'
  words: string[]
  found: string[]
  size: number
  grid: string[][]
  seed: number
  score: number
  best: number
  updatedAt: number
}

export interface PuzzleHost {
  loadPuzzle(): PuzzleRecord | null
  savePuzzle(record: PuzzleRecord): void
  clearPuzzle(): void
}

function makeMock(): PuzzleHost {
  const store = createMockRecordStore<PuzzleRecord>({
    key: KEY,
    validate: (value): value is PuzzleRecord =>
      value !== null &&
      typeof value === 'object' &&
      (value as PuzzleRecord).kind === 'puzzle' &&
      Array.isArray((value as PuzzleRecord).words) &&
      Array.isArray((value as PuzzleRecord).found) &&
      Array.isArray((value as PuzzleRecord).grid),
  })
  return {
    loadPuzzle() {
      return store.list()[0] ?? null
    },
    savePuzzle(record) {
      const existing = store.list()
      if (existing.length > 0) {
        store.update(existing[0].id, record)
      } else {
        store.add(record)
      }
    },
    clearPuzzle() {
      for (const record of store.list()) {
        store.remove(record.id)
      }
    },
  }
}

export const host: PuzzleHost = makeMock()
