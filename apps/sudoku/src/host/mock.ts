const KEY = 'lacuna.sudoku.save'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface PuzzleRecord {
  id: string
  kind: 'puzzle'
  difficulty: Difficulty
  given: number[]
  board: number[]
  seconds: number
  startedAt: number
  updatedAt: number
}

export interface PuzzleHost {
  loadPuzzle(): PuzzleRecord | null
  savePuzzle(record: PuzzleRecord): void
  clearPuzzle(): void
}

function makeMock(): PuzzleHost {
  return {
    loadPuzzle() {
      const raw = localStorage.getItem(KEY)
      if (!raw) return null
      try {
        const value = JSON.parse(raw)
        if (value && value.kind === 'puzzle' && Array.isArray(value.given) && Array.isArray(value.board)) {
          return value as PuzzleRecord
        }
      } catch {
        // a corrupt save is treated as no save
      }
      return null
    },
    savePuzzle(record) {
      localStorage.setItem(KEY, JSON.stringify(record))
    },
    clearPuzzle() {
      localStorage.removeItem(KEY)
    },
  }
}

export const host: PuzzleHost = makeMock()
