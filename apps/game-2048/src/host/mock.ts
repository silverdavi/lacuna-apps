export const SIZE = 4

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface SavedGame {
  score: number
  best: number
  board: (number | null)[][]
}

const KEY = 'lacuna.game-2048.game-state.v1'

function fresh(): SavedGame {
  return {
    score: 0,
    best: 0,
    board: Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null)),
  }
}

function parseBoard(raw: unknown): (number | null)[][] {
  const board: (number | null)[][] = Array.from({ length: SIZE }, () =>
    Array<number | null>(SIZE).fill(null),
  )
  if (!Array.isArray(raw)) return board
  for (let r = 0; r < SIZE; r++) {
    const row = (raw as unknown[])[r]
    if (!Array.isArray(row)) continue
    for (let c = 0; c < SIZE; c++) {
      const v = (row as unknown[])[c]
      if (typeof v === 'number' && Number.isInteger(v) && v > 0) board[r][c] = v
    }
  }
  return board
}

function parseState(raw: string): SavedGame {
  const parsed = JSON.parse(raw) as Partial<SavedGame>
  return {
    score: typeof parsed.score === 'number' && Number.isFinite(parsed.score) ? parsed.score : 0,
    best: typeof parsed.best === 'number' && Number.isFinite(parsed.best) ? parsed.best : 0,
    board: parseBoard(parsed.board),
  }
}

function load(): SavedGame {
  let saved: SavedGame | null = null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) saved = parseState(raw)
  } catch {
    saved = null
  }
  if (!saved) return fresh()
  return saved
}

function save(state: SavedGame) {
  window.localStorage.setItem(KEY, JSON.stringify(state))
}

export const store = {
  load(): SavedGame {
    return load()
  },
  save(state: SavedGame) {
    save(state)
  },
}
