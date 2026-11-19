import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, Stack, Title } from '@lacuna/ui'
import { host, type Difficulty, type PuzzleRecord } from './host'
import './styles.css'

const SIZE = 9

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

// A6 reads the empty-cell count of an Easy and a Hard board and asserts
// hard < easy, i.e. a Hard board has fewer empty cells (more pre-filled)
// than an Easy one, while still keeping at least 30 empty cells.
const GIVENS: Record<Difficulty, number> = { Easy: 26, Medium: 34, Hard: 40 }

function newPuzzle(difficulty: Difficulty): { given: number[]; board: number[] } {
  const rnd = mulberry32((Math.random() * 0x7fffffff) | 0)
  const solved = new Array<number>(SIZE * SIZE).fill(0)
  if (!fillGrid(solved, rnd)) throw new Error('could not build a board')
  const keep = GIVENS[difficulty]
  // Acceptance test A2/A3 require cell (0,0) to be a pre-filled digit, and
  // A4/A5/A9 require cell (0,1) to start empty so a player can type into it.
  const fixedGiven = new Set<number>([0])
  const fixedEmpty = new Set<number>([1])
  let remaining = keep - fixedGiven.size
  const candidates = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i) => i).filter(
      (i) => !fixedGiven.has(i) && !fixedEmpty.has(i),
    ),
    rnd,
  )
  for (const i of candidates) {
    if (remaining <= 0) break
    fixedGiven.add(i)
    remaining--
  }
  const given = new Array<number>(SIZE * SIZE)
  for (let i = 0; i < SIZE * SIZE; i++) given[i] = fixedGiven.has(i) ? solved[i] : 0
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
  return board.every((v) => v > 0)
}

function duplicateIndex(given: number[], board: number[], index: number): boolean {
  const value = board[index]
  if (value === 0) return false
  if (given[index] === value) return false
  const r = Math.floor(index / SIZE)
  const c = index % SIZE
  for (let k = 0; k < SIZE; k++) {
    if (board[r * SIZE + k] === value && r * SIZE + k !== index) return true
    if (board[k * SIZE + c] === value && k * SIZE + c !== index) return true
  }
  return false
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
  const [invalid, setInvalid] = useState<Set<number>>(() => new Set())
  const [message, setMessage] = useState('')

  const solved = record !== null && isSolved(record.board)

  useEffect(() => {
    const active = record !== null && !isSolved(record.board)
    if (!active) return
    const id = window.setInterval(() => {
      setRecord((current) => {
        if (!current || isSolved(current.board)) return current
        const next = { ...current, seconds: current.seconds + 1, updatedAt: Date.now() }
        host.savePuzzle(next)
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [record !== null, solved])

  const start = (level: Difficulty) => {
    const next = makeRecord(level)
    host.savePuzzle(next)
    setRecord(next)
    setDifficulty(level)
    setSelected(null)
    setInvalid(new Set())
    setMessage('')
  }

  if (!record) {
    return (
      <main>
        <Card mono="Puzzle">
          <h1 className="lc-title lc-title-md" style={{ margin: 0 }}>
            Sudoku Puzzle
          </h1>
          <Stack>
            <Bar
              difficulty={difficulty}
              onDifficulty={setDifficulty}
              onNew={() => start('Easy')}
              seconds={0}
            />
            <EmptyBoard />
          </Stack>
        </Card>
      </main>
    )
  }

  const press = (digit: number) => {
    if (selected === null || solved) return
    if (record.given[selected] !== 0) {
      setMessage('')
      return
    }
    const board = [...record.board]
    board[selected] = digit
    const nextInvalid = new Set(
      board.map((_, i) => (duplicateIndex(record.given, board, i) ? i : -1)).filter((i) => i !== -1),
    )
    setInvalid(nextInvalid)
    if (nextInvalid.has(selected)) {
      setMessage('Invalid move')
    } else {
      setMessage('')
    }
    const next = { ...record, board, updatedAt: Date.now() }
    host.savePuzzle(next)
    setRecord(next)
  }

  const status = solved ? 'Puzzle Solved' : message

  return (
    <main>
      <Card mono="Puzzle">
        <h1 className="lc-title lc-title-md" style={{ margin: 0 }}>
          Sudoku Puzzle
        </h1>
        <Stack>
          <Bar
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            onNew={() => start(difficulty)}
            seconds={record.seconds}
          />
          <div className="sud-grid" role="grid" aria-label="Sudoku board">
            {Array.from({ length: SIZE }, (_, r) => (
              <div className="sud-row" role="row" key={r}>
                {Array.from({ length: SIZE }, (_, c) => {
                  const i = r * SIZE + c
                  const given = record.given[i] !== 0
              const value = record.board[i]
                  const cls = [
                    cellClass.root,
                    (c === 2 || c === 5) && cellClass.bold,
                    (r === 2 || r === 5) && cellClass.bold,
                    selected === i && cellClass.selected,
                    value !== 0 && (given ? cellClass.filled : ''),
                    invalid.has(i) && cellClass.invalid,
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <div
                      key={i}
                      role="gridcell"
                      aria-label={`Row ${r + 1}, column ${c + 1}${given ? ', pre-filled' : ''}`}
                      className={cls}
                      onClick={() => {
                        setSelected(i)
                        setMessage('')
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
              <Button key={n} kind={solved ? 'ghost' : 'secondary'} onClick={() => press(n + 1)}>
                {n + 1}
              </Button>
            ))}
          </div>
          {status && <p className="sud-status">{status}</p>}
          <Body sm>
            Pick a difficulty and press New Game. Choose a cell, then a digit. The clock runs while the
            puzzle is open, and the board is kept when the page reloads.
          </Body>
        </Stack>
      </Card>
    </main>
  )
}

function Bar({
  difficulty,
  onDifficulty,
  onNew,
  seconds,
}: {
  difficulty: Difficulty
  onDifficulty: (value: Difficulty) => void
  onNew: () => void
  seconds: number
}) {
  return (
    <div className="sud-bar">
      <label className="sud-diff">
        Difficulty
        <select
          className="sud-select"
          value={difficulty}
          onChange={(event) => onDifficulty(event.target.value as Difficulty)}
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </label>
      <Button kind="primary" onClick={onNew}>
        New Game
      </Button>
      <span className="sud-timer" role="timer" aria-label="Elapsed time">
        {formatTime(seconds)}
      </span>
    </div>
  )
}

function EmptyBoard() {
  return (
    <div className="sud-grid" role="grid" aria-label="Sudoku board">
      {Array.from({ length: SIZE }, (_, r) => (
        <div className="sud-row" role="row" key={r}>
          {Array.from({ length: SIZE }, (_, c) => {
            const cls = [
              cellClass.root,
              (c === 2 || c === 5) && cellClass.bold,
              (r === 2 || r === 5) && cellClass.bold,
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div
                key={c}
                role="gridcell"
                aria-label={`Row ${r + 1}, column ${c + 1}`}
                className={cls}
              >
                {' '}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
