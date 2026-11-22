import { CSSProperties, useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Tag,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  conflictSet,
  elapsedSeconds,
  formatTime,
  isSolved,
  makeRecord,
  placeDigit,
  statusFor,
  type Board as BoardType,
  type Difficulty,
  type TimerBase,
} from './engine'
import { host, type PuzzleRecord } from './host'

const ID = 'lacuna.sudoku.save'

function cellLabel(index: number): string {
  const row = Math.floor(index / 9) + 1
  const col = (index % 9) + 1
  return `Row ${row}, Column ${col}`
}

function boardToText(board: BoardType): string {
  const lines: string[] = []
  for (let r = 0; r < 9; r++) {
    const row: string[] = []
    for (let c = 0; c < 9; c++) {
      row.push(board[r * 9 + c] ? String(board[r * 9 + c]) : '.')
    }
    lines.push(row.join(' '))
  }
  return lines.join('\n')
}

export function App() {
  const [record, setRecord] = useState<PuzzleRecord | null>(() => host.loadPuzzle())
  const [selected, setSelected] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy')
  const [now, setNow] = useState<number>(() => Date.now())

  const { copy, copied } = useClipboard({ timeoutMs: 1500 })

  useEffect(() => {
    if (!record || isSolved(record.board)) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [record?.id, record?.board, record?.startedAt])

  const board: BoardType = record?.board ?? new Array<number>(81).fill(0)
  const given: BoardType = record?.given ?? new Array<number>(81).fill(0)
  const solved = record != null && isSolved(board)
  const base: TimerBase | null = record ? { at: record.startedAt, seconds: record.seconds } : null
  const seconds = base ? elapsedSeconds(base, solved ? base.at : now) : 0
  const status = record ? statusFor(board) : ''

  function handleNewGame() {
    const rec = makeRecord(difficulty, Date.now(), ID)
    host.savePuzzle(rec)
    setRecord(rec)
    setSelected(null)
  }

  function handleSelectCell(index: number) {
    if (solved || given[index] !== 0) return
    setSelected(index)
  }

  function handleNumber(n: number) {
    if (selected === null || record == null) return
    const nextBoard = placeDigit(record.given, record.board, selected, n)
    if (nextBoard === record.board) return
    const next = { ...record, board: nextBoard, updatedAt: Date.now() }
    if (isSolved(nextBoard)) {
      const elapsed = base ? elapsedSeconds(base, Date.now()) : 0
      next.seconds = elapsed
      next.startedAt = 0
    }
    host.savePuzzle(next)
    setRecord(next)
  }

  async function handleCopy() {
    await copy(boardToText(board))
  }

  const invalidSet = record ? conflictSet(board) : new Set<number>()

  function cellStyle(i: number): CSSProperties {
    const value = board[i]
    const isGiven = given[i] !== 0
    const isSelected = selected === i
    const isInvalid = value !== 0 && invalidSet.has(i)
    if (isInvalid) return { background: 'var(--geo-verm)', color: 'var(--on-accent)' }
    if (isSelected) return { background: 'var(--ui-card)' }
    if (isGiven) return { fontWeight: 700 }
    return {}
  }

  return (
    <AppShell
      name="Sudoku"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={record ? `${board.filter((v) => v === 0).length} empty` : 'new'}
      side={
        <Rail title="Timer" note={solved ? 'clock paused' : 'running'}>
          <div className="sud-timer" role="timer" aria-label="Time">
            {formatTime(seconds)}
          </div>
          <KpiRow>
            <Kpi label="Difficulty" value={record ? record.difficulty : 'Practice'} />
            <Kpi label="Empty" value={board.filter((v) => v === 0).length} />
            <Kpi label="Filled" value={board.filter((v) => v !== 0).length} />
          </KpiRow>
          <Stack>
            <Tag accent>{solved ? 'Puzzle Solved' : 'In progress'}</Tag>
          </Stack>
          <Actions>
            <Button onClick={handleCopy}>{copied ? 'Copied' : 'Copy board'}</Button>
          </Actions>
        </Rail>
      }
    >
      <Card
        mono="Game"
        actions={
          <Actions>
            <Button kind="primary" onClick={handleNewGame}>
              New Game
            </Button>
          </Actions>
        }
      >
        <h2 style={{ margin: 0, marginBottom: 'calc(12px * var(--sf))', fontFamily: 'var(--sans)', fontSize: 'calc(16px * var(--tf))', fontWeight: 600, color: 'var(--ink)' }}>
          Sudoku Puzzle
        </h2>
        <div style={{ marginBottom: 'calc(12px * var(--sf))' }}>
          <label className="lc-field">
            <span className="lc-field-label">Difficulty</span>
            <select
              className="lc-input"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              aria-label="Difficulty"
            >
              <option value="Practice">Practice</option>
              <option value="Easy">Easy</option>
              <option value="Hard">Hard</option>
            </select>
          </label>
        </div>
        <div className="sud-grid" role="grid" aria-label="Board">
          {Array.from({ length: 9 }, (_, r) => (
            <div key={r} role="row" className="sud-row">
              {Array.from({ length: 9 }, (_, c) => {
                const i = r * 9 + c
                const value = board[i]
                return (
                  <button
                    key={c}
                    type="button"
                    role="gridcell"
                    aria-label={cellLabel(i)}
                    aria-selected={selected === i || undefined}
                    aria-invalid={value !== 0 && invalidSet.has(i) ? true : undefined}
                    onClick={() => handleSelectCell(i)}
                    style={cellStyle(i)}
                  >
                    {value !== 0 ? String(value) : ''}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {status === 'Invalid move' ? (
          <div style={{ marginTop: 'calc(8px * var(--sf))' }} role="alert">
            <Tag>Invalid move</Tag>
          </div>
        ) : null}
      </Card>

      <Card mono="Controls" title="Number pad">
        <div className="sud-keys" role="group" aria-label="Number pad">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <Button key={n} onClick={() => handleNumber(n)}>
              {n}
            </Button>
          ))}
          <Button onClick={() => selected !== null && handleNumber(0)}>Erase</Button>
        </div>
      </Card>

      <Card mono="Rules" title="How to play">
        <Stack>
          <p style={{ margin: 0 }}>
            Fill the 9 by 9 grid so every row, column and 3 by 3 block contains each digit 1 to 9 exactly once.
          </p>
          <p style={{ margin: 0 }}>
            Click a cell, then a number to place it. Select a filled cell and press Erase to clear it.
          </p>
        </Stack>
      </Card>
    </AppShell>
  )
}
