import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AppShell, Button, Card, Kpi, KpiRow, Keys, Rail, Stack, Tag } from '@lacuna/ui'
import {
  makeRecord,
  placeDigit,
  conflictSet,
  isSolved,
  statusFor,
  elapsedSeconds,
  formatTime,
  type Difficulty,
} from './engine'
import { host, type PuzzleRecord } from './host'
import './styles.css'

type Status = 'idle' | 'playing' | 'finished'

let keyHandler: ((e: KeyboardEvent) => void) | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keyHandler?.(e))
}

function freshRecord(difficulty: Difficulty, now: number): PuzzleRecord {
  return makeRecord(difficulty, now, `puz-${now}`, Math.floor(now / 1000))
}

export function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy')
  const [record, setRecord] = useState<PuzzleRecord>(() => host.loadPuzzle() ?? freshRecord('Easy', Date.now()))
  const [selected, setSelected] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [base, setBase] = useState({ at: Date.now(), seconds: 0 })
  const [now, setNow] = useState(() => Date.now())

  const seconds = status === 'playing' ? elapsedSeconds(base, now) : record.seconds
  const time = formatTime(seconds)
  const statusText = statusFor(record.board)
  const conflicts = conflictSet(record.board)

  const stateRef = useRef<{ place: (d: number) => void; start: () => void }>({
    place: () => {},
    start: () => {},
  })

  useEffect(() => {
    host.savePuzzle({ ...record, seconds })
  }, [record, seconds])

  useEffect(() => {
    if (status !== 'playing') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [status])

  function select(i: number) {
    if (status === 'finished') return
    setSelected(selected === i ? null : i)
  }

  function place(digit: number) {
    if (status !== 'playing' || selected === null) return
    if (record.given[selected] !== 0) return
    const board = placeDigit(record.given, record.board, selected, digit)
    if (board === record.board) return
    if (isSolved(board)) {
      setRecord({ ...record, board, seconds: elapsedSeconds(base, Date.now()), updatedAt: Date.now() })
      setStatus('finished')
    } else {
      setRecord({ ...record, board, updatedAt: Date.now() })
    }
  }

  function start() {
    if (status === 'finished') return
    setStatus('playing')
    setBase({ at: Date.now(), seconds: 0 })
    setNow(Date.now())
  }

  function newGame(d: Difficulty) {
    setRecord(freshRecord(d, Date.now()))
    setSelected(null)
    setStatus('playing')
    setBase({ at: Date.now(), seconds: 0 })
    setNow(Date.now())
  }

  stateRef.current = { place, start }
  keyHandler = (e) => {
    const s = stateRef.current
    if (e.key >= '1' && e.key <= '9') s.place(Number(e.key))
    else if (e.key === ' ') {
      e.preventDefault()
      s.start()
    }
  }

  const selectedBox =
    selected === null ? -1 : Math.floor(selected / 9 / 3) * 3 + Math.floor((selected % 9) / 3)

  const rows: ReactNode[] = []
  for (let r = 0; r < 9; r++) {
    const cells: ReactNode[] = []
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c
      const v = record.board[i]
      const given = record.given[i] !== 0
      const invalid = conflicts.has(i)
      const isSel = selected === i
      const inBox = Math.floor(r / 3) === selectedBox && Math.floor(c / 3) === selectedBox
      const cls =
        'sud-cell' +
        (given ? ' sud-cell--given' : '') +
        (isSel ? ' sud-cell--selected' : '') +
        (invalid ? ' sud-cell--invalid' : '') +
        (inBox ? ' sud-cell--peer' : '')
      cells.push(
        <button
          key={i}
          type="button"
          role="gridcell"
          aria-label={`Row ${r + 1}, Column ${c + 1}`}
          aria-selected={isSel || undefined}
          aria-invalid={invalid ? 'true' : undefined}
          data-row={r + 1}
          data-col={c + 1}
          data-value={v}
          data-answer={record.given[i]}
          data-selected={isSel ? 'true' : undefined}
          data-conflict={invalid ? 'true' : undefined}
          className={cls}
          onClick={() => select(i)}
        >
          <span className="sud-sr">{v || '\u00a0'}</span>
        </button>,
      )
    }
    rows.push(
      <div key={r} role="row">
        {cells}
      </div>,
    )
  }

  return (
    <AppShell
      name="Sudoku"
      icon="grid"
      hue="gold"
      category="Games"
      meta="9 × 9"
      status="Local · no network"
      side={
        <Rail title="Game" note={record.difficulty}>
          <KpiRow>
            <Kpi label="Status" value={status === 'playing' ? 'playing' : status === 'finished' ? 'solved' : 'ready'} />
            <Kpi label="Difficulty" value={record.difficulty} />
          </KpiRow>
          {status === 'finished' ? <Tag accent>Solved in {time}</Tag> : null}
        </Rail>
      }
    >
      <div className="sud-heading">
        <h2 className="lc-title lc-title-md">Sudoku Puzzle</h2>
        <span role="timer" aria-label="Time" className="sud-timer">
          {time}
        </span>
      </div>

      <Card title="Board">
        <div className="sud-controls">
          <div className="lc-field">
            <label className="lc-field-label" htmlFor="sud-difficulty">Difficulty</label>
            <select
              id="sud-difficulty"
              className="lc-input"
              value={difficulty}
              onChange={(e) => {
                const d = e.target.value as Difficulty
                setDifficulty(d)
                newGame(d)
              }}
            >
              <option value="Practice">Practice</option>
              <option value="Easy">Easy</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <Button kind="primary" onClick={() => newGame(difficulty)}>
            New Game
          </Button>
        </div>
        <div role="grid" aria-label="Board" className="sud-grid">
          {rows}
        </div>
        {statusText ? (
          <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
            <Tag accent={statusText === 'Invalid move'}>{statusText}</Tag>
          </div>
        ) : null}
      </Card>

      <Card title="Controls">
        <Stack>
          <div className="sud-digits">
            {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => (
              <Button
                key={n}
                ariaLabel={String(n)}
                style={{ width: 'calc(40px * var(--sf))', justifyContent: 'center', fontFamily: 'var(--mono)' }}
                onClick={() => place(n)}
                disabled={status !== 'playing' || selected === null}
              >
                {n}
              </Button>
            ))}
          </div>
          <Keys
            items={[
              ['1–9', 'Fill the selected cell.'],
              ['Space', 'Start the timer.'],
            ]}
          />
        </Stack>
      </Card>
    </AppShell>
  )
}
