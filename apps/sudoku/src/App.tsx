import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, Stack } from '@lacuna/ui'
import { host, type Difficulty, type PuzzleRecord } from './host'
import './styles.css'

const SIZE = 9

// "Practice" is a fixed board: the solved grid below with exactly four empty
// cells. Each empty cell's index is row * 9 + (col - 1):
//   Row 1 Column 2 -> index  1 -> 2
//   Row 2 Column 5 -> index 13 -> 8
//   Row 5 Column 5 -> index 40 -> 9
//   Row 9 Column 9 -> index 80 -> 8
const PRACTICE_SOLUTION = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  4, 5, 6, 7, 8, 9, 1, 2, 3,
  7, 8, 9, 1, 2, 3, 4, 5, 6,
  2, 3, 4, 5, 6, 7, 8, 9, 1,
  5, 6, 7, 8, 9, 1, 2, 3, 4,
  8, 9, 1, 2, 3, 4, 5, 6, 7,
  3, 4, 5, 6, 7, 8, 9, 1, 2,
  6, 7, 8, 9, 1, 2, 3, 4, 5,
  9, 1, 2, 3, 4, 5, 6, 7, 8,
]

const PRACTICE_EMPTY = new Set<number>([1, 13, 40, 80])

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], rnd: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function canPlace(d: number[], i: number, n: number): boolean {
  const r = Math.floor(i / SIZE)
  const c = i % SIZE
  const br = Math.floor(r / 3)
  const bc = Math.floor(c / 3)
  for (let k = 0; k < SIZE; k++) {
    if (d[r * SIZE + k] === n) return false
    if (d[k * SIZE + c] === n) return false
  }
  for (let k = 0; k < 9; k++) {
    if (d[(br * 3 + Math.floor(k / 3)) * SIZE + bc * 3 + (k % 3)] === n) return false
  }
  return true
}

function fillGrid(d: number[], rnd: () => number): boolean {
  const i = d.indexOf(0)
  if (i === -1) return true
  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd)) {
    if (!canPlace(d, i, n)) continue
    d[i] = n
    if (fillGrid(d, rnd)) return true
    d[i] = 0
  }
  return false
}

// Empty-cell counts per difficulty. Hard leaves at least 30 empty cells.
const GIVENS: Record<Exclude<Difficulty, 'Practice'>, number> = {
  Easy: 46,
  Hard: 42,
}

function newPuzzle(difficulty: Difficulty): { given: number[]; board: number[] } {
  if (difficulty === 'Practice') {
    const given = PRACTICE_SOLUTION.map((v, i) => (PRACTICE_EMPTY.has(i) ? 0 : v))
    return { given, board: [...given] }
  }
  const rnd = mulberry32((Math.random() * 0x7fffffff) | 0)
  const solved = new Array<number>(SIZE * SIZE).fill(0)
  if (!fillGrid(solved, rnd)) throw new Error('could not build a board')
  const keep = GIVENS[difficulty]
  const keepIndex = new Set(
    shuffle(Array.from({ length: SIZE * SIZE }, (_, i) => i), rnd).slice(0, keep),
  )
  const given = solved.map((v, i) => (keepIndex.has(i) ? v : 0))
  return { given, board: [...given] }
}

function makeRecord(difficulty: Difficulty): PuzzleRecord {
  const { given, board } = newPuzzle(difficulty)
  return {
    id: `puzzle-${Date.now().toString(36)}`,
    kind: 'puzzle',
    difficulty,
    given,
    board,
    seconds: 0,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function formatTime(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isSolved(board: number[]): boolean {
  return board.every((v) => v > 0) && hasConflict(board) === -1
}

// Index of a cell whose value repeats in its row, column or box, or -1.
function hasConflict(board: number[]): number {
  for (let i = 0; i < board.length; i++) {
    const v = board[i]
    if (v === 0) continue
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    const br = Math.floor(r / 3)
    const bc = Math.floor(c / 3)
    for (let k = 0; k < SIZE; k++) {
      if (r * SIZE + k !== i && board[r * SIZE + k] === v) return i
      if (k * SIZE + c !== i && board[k * SIZE + c] === v) return i
    }
    for (let k = 0; k < 9; k++) {
      const bi = (br * 3 + Math.floor(k / 3)) * SIZE + bc * 3 + (k % 3)
      if (bi !== i && board[bi] === v) return i
    }
  }
  return -1
}

function conflictSet(board: number[]): Set<number> {
  const bad = new Set<number>()
  for (let i = 0; i < board.length; i++) {
    const v = board[i]
    if (v === 0) continue
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    const br = Math.floor(r / 3)
    const bc = Math.floor(c / 3)
    for (let k = 0; k < SIZE; k++) {
      if (r * SIZE + k !== i && board[r * SIZE + k] === v) bad.add(i)
      if (k * SIZE + c !== i && board[k * SIZE + c] === v) bad.add(i)
    }
    for (let k = 0; k < 9; k++) {
      if ((br * 3 + Math.floor(k / 3)) * SIZE + bc * 3 + (k % 3) !== i) {
        const bi = (br * 3 + Math.floor(k / 3)) * SIZE + bc * 3 + (k % 3)
        if (board[bi] === v) bad.add(i)
      }
    }
  }
  return bad
}

const cellClass = {
  root: 'sud-cell',
  bold: 'sud-cell--bold',
  selected: 'sud-cell--selected',
  filled: 'sud-cell--filled',
  invalid: 'sud-cell--invalid',
}

export function App() {
  const [record, setRecord] = useState<PuzzleRecord | null>(() => host.loadPuzzle())
  const [difficulty, setDifficulty] = useState<Difficulty>(() => record?.difficulty ?? 'Easy')
  const [selected, setSelected] = useState<number | null>(null)

  // Elapsed seconds are derived from a wall-clock reference rather than an
  // incrementing counter, so the displayed time tracks real elapsed time even
  // when the tick cadence is coarser than one second.
  const timerBaseRef = useRef<{ at: number; seconds: number } | null>(null)

  const solved = record !== null && isSolved(record.board)
  const conflict = record ? conflictSet(record.board) : new Set<number>()
  const status = record !== null ? (solved ? 'Puzzle Solved' : conflict.size > 0 ? 'Invalid move' : '') : ''

  const currentSeconds = (rec: PuzzleRecord | null): number => {
    const base = timerBaseRef.current
    if (!rec || !base) return rec ? rec.seconds : 0
    const elapsed = Math.max(0, Math.floor((Date.now() - base.at) / 1000))
    return base.seconds + elapsed
  }

  const displaySeconds = record ? currentSeconds(record) : 0

  useEffect(() => {
    const active = record !== null && !isSolved(record.board)
    if (!active) {
      timerBaseRef.current = null
      return
    }
    if (timerBaseRef.current === null) {
      timerBaseRef.current = { at: Date.now(), seconds: record ? record.seconds : 0 }
    }
    const id = window.setInterval(() => {
      setRecord((current) => {
        if (!current || isSolved(current.board)) return current
        const base = timerBaseRef.current
        if (!base) return current
        const seconds = base.seconds + Math.max(0, Math.floor((Date.now() - base.at) / 1000))
        if (seconds === current.seconds) return current
        const next = { ...current, seconds, updatedAt: Date.now() }
        host.savePuzzle(next)
        return next
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [record !== null, solved])

  const start = (level: Difficulty) => {
    const next = makeRecord(level)
    host.savePuzzle(next)
    timerBaseRef.current = null
    setRecord(next)
    setDifficulty(level)
    setSelected(null)
  }

  const press = (digit: number) => {
    if (!record || selected === null || solved) return
    if (record.given[selected] !== 0) return
    const board = [...record.board]
    board[selected] = digit
    const next = { ...record, board, updatedAt: Date.now() }
    host.savePuzzle(next)
    setRecord(next)
  }

  return (
    <main>
      <Card mono="Puzzle">
        <h1 className="lc-title lc-title-md" style={{ margin: 0 }}>
          Sudoku Puzzle
        </h1>
        <Stack>
          <div className="sud-bar">
            <label className="sud-diff" htmlFor="sud-difficulty">
              Difficulty
            </label>
            <select
              id="sud-difficulty"
              className="sud-select"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            >
              <option value="Practice">Practice</option>
              <option value="Easy">Easy</option>
              <option value="Hard">Hard</option>
            </select>
            <Button kind="primary" onClick={() => start(difficulty)}>
              New Game
            </Button>
            <span className="sud-timer" role="timer" aria-label="Time">
              {formatTime(displaySeconds)}
            </span>
          </div>
          <div className="sud-grid" role="grid" aria-label="Board">
            {Array.from({ length: SIZE }, (_, r) => (
              <div className="sud-row" role="row" key={r}>
                {Array.from({ length: SIZE }, (_, c) => {
                  const i = r * SIZE + c
                  const given = record !== null && record.given[i] !== 0
                  const value = record ? record.board[i] : 0
                  const cls = [
                    cellClass.root,
                    (c === 2 || c === 5) && cellClass.bold,
                    (r === 2 || r === 5) && cellClass.bold,
                    selected === i && cellClass.selected,
                    value !== 0 && given && cellClass.filled,
                    conflict.has(i) && cellClass.invalid,
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <div
                      key={i}
                      role="gridcell"
                      aria-label={`Row ${r + 1}, Column ${c + 1}`}
                      aria-invalid={conflict.has(i) ? 'true' : undefined}
                      className={cls}
                      onClick={() => {
                        setSelected(i)
                      }}
                    >
                      {value === 0 ? '' : value}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="sud-digits" role="group" aria-label="Digits">
            {Array.from({ length: 9 }, (_, n) => (
              <Button key={n} kind="secondary" onClick={() => press(n + 1)}>
                {n + 1}
              </Button>
            ))}
          </div>
          {status && <p className="sud-status" role="status">{status}</p>}
          <Body sm>
            Pick a difficulty and press New Game. Choose a cell, then a digit. The clock runs while the
            puzzle is open, and the board is kept when the page reloads.
          </Body>
        </Stack>
      </Card>
    </main>
  )
}
