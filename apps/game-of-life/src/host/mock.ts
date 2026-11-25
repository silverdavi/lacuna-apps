const KEY = 'lacuna.game-of-life.board.v1'

export type BoardRecord = {
  cols: number
  rows: number
  cells: number[]
}

export const mockStore = {
  readBoard(): BoardRecord | null {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw === null) return null
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return null
      const record = parsed as Partial<BoardRecord>
      if (
        typeof record.cols !== 'number' ||
        typeof record.rows !== 'number' ||
        !Number.isInteger(record.cols) ||
        !Number.isInteger(record.rows) ||
        record.cols <= 0 ||
        record.rows <= 0 ||
        !Array.isArray(record.cells) ||
        record.cells.length !== record.cols * record.rows
      ) {
        return null
      }
      return {
        cols: record.cols,
        rows: record.rows,
        cells: record.cells.map((c) => (c === 1 ? 1 : 0)),
      }
    } catch {
      return null
    }
  },
  writeBoard(record: BoardRecord) {
    try {
      localStorage.setItem(KEY, JSON.stringify(record))
    } catch {
      // storage unavailable; the world lives for this session only
    }
  },
}
