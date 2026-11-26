import { createMockRecordStore } from '@lacuna/host-mock'
import type { Board, RecordShape } from '../engine'

const KEY = 'lacuna.sliding-puzzle.save'

export interface PuzzleRecord {
  id: string
  kind: 'sliding-puzzle'
  board: Board
  moves: number
  best: number
  runs: { moves: number; status: string; at: number }[]
  seed: number | null
  updatedAt: number
}

export interface PuzzleHost {
  load(): PuzzleRecord | null
  save(record: PuzzleRecord): void
  clear(): void
}

function makeMock(): PuzzleHost {
  const store = createMockRecordStore<PuzzleRecord>({
    key: KEY,
    validate: (value): value is PuzzleRecord =>
      value !== null &&
      typeof value === 'object' &&
      (value as PuzzleRecord).kind === 'sliding-puzzle' &&
      Array.isArray((value as PuzzleRecord).board) &&
      typeof (value as PuzzleRecord).moves === 'number',
  })
  return {
    load() {
      return store.list()[0] ?? null
    },
    save(record) {
      const existing = store.list()
      if (existing.length > 0) {
        store.update(existing[0].id, record)
      } else {
        store.add(record)
      }
    },
    clear() {
      for (const record of store.list()) {
        store.remove(record.id)
      }
    },
  }
}

export const host: PuzzleHost = makeMock()

export function toRecord(data: RecordShape): PuzzleRecord {
  return {
    id: `puzzle-${data.updatedAt.toString(36)}`,
    kind: 'sliding-puzzle',
    board: data.board,
    moves: data.moves,
    best: data.best,
    runs: data.runs,
    seed: data.seed,
    updatedAt: data.updatedAt,
  }
}

export function fromRecord(rec: PuzzleRecord | null): RecordShape {
  if (!rec) return { board: [], moves: 0, best: 0, runs: [], seed: null, updatedAt: Date.now() }
  return {
    board: rec.board,
    moves: rec.moves,
    best: rec.best,
    runs: rec.runs,
    seed: rec.seed,
    updatedAt: rec.updatedAt,
  }
}
