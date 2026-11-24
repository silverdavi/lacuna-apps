import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, Stack } from '@lacuna/ui'
import { host, type Difficulty, type PuzzleRecord } from './host'
import {
  SIZE,
  formatTime,
  isSolved,
  conflictSet,
  makeRecord,
  placeDigit,
  elapsedSeconds,
  type TimerBase,
} from './engine'
import './styles.css'

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
  const timerBaseRef = useRef<TimerBase | null>(null)

  const solved = record !== null && isSolved(record.board)
  const conflict = record ? conflictSet(record.board) : new Set<number>()
  const status = record !== null ? (solved ? 'Puzzle Solved' : conflict.size > 0 ? 'Invalid move' : '') : ''

  const currentSeconds = (rec: PuzzleRecord | null): number => {
    const base = timerBaseRef.current
    if (!rec || !base) return rec ? rec.seconds : 0
    return elapsedSeconds(base, Date.now())
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
        const seconds = elapsedSeconds(base, Date.now())
        if (seconds === current.seconds) return current
        const next = { ...current, seconds, updatedAt: Date.now() }
        host.savePuzzle(next)
        return next
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [record !== null, solved])

  const start = (level: Difficulty) => {
    const next = makeRecord(level, Date.now(), `puzzle-${Date.now().toString(36)}`)
    host.savePuzzle(next)
    timerBaseRef.current = null
    setRecord(next)
    setDifficulty(level)
    setSelected(null)
  }

  const press = (digit: number) => {
    if (!record || selected === null || solved) return
    const board = placeDigit(record.given, record.board, selected, digit)
    if (board === record.board) return
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
