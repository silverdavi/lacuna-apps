// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockValue } from '@lacuna/host-mock'

export type BoardRecord = {
  cols: number
  rows: number
  cells: number[]
}

const KEY = 'lacuna.game-of-life.board.v1'

function isBoardRecord(v: unknown): v is BoardRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Partial<BoardRecord>
  return (
    typeof r.cols === 'number' &&
    Number.isInteger(r.cols) &&
    r.cols > 0 &&
    typeof r.rows === 'number' &&
    Number.isInteger(r.rows) &&
    r.rows > 0 &&
    Array.isArray(r.cells) &&
    r.cells.length === r.cols * r.rows
  )
}

function normalize(record: BoardRecord): BoardRecord {
  return {
    cols: record.cols,
    rows: record.rows,
    cells: record.cells.map((c) => (c === 1 ? 1 : 0)),
  }
}

function value() {
  return createMockValue<BoardRecord>({
    key: KEY,
    fallback: { cols: 0, rows: 0, cells: [] },
    validate: isBoardRecord,
  })
}

export const mockStore = {
  readBoard(): BoardRecord | null {
    const raw = value().get()
    if (!isBoardRecord(raw) || raw.cols === 0 || raw.rows === 0) return null
    return normalize(raw)
  },
  writeBoard(record: BoardRecord) {
    value().set(record)
  },
}
