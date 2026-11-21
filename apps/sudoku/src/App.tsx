import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AppShell, Card, Rail, Button, Kpi, KpiRow, Keys, Tag } from '@lacuna/ui'
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

const boardVars: CSSProperties = {
  ['--cols' as string]: 9,
  ['--rows' as string]: 9,
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

  // The frozen time after solving: the record's own seconds stay fixed.
  const seconds = status === 'playing' ? elapsedSeconds(base, now) : record.seconds
  const time = formatTime(seconds)
  const statusText = statusFor(record.board)
  const conflicts = conflictSet(record.board)
  const stateRef = useRef<{ status: Status; record: PuzzleRecord; selected: number | null; base: { at: number; seconds: number }; place: (digit: number) => void; start: () => void }>({
    status,
    record,
    selected,
    base,
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

  stateRef.current = { status, record, selected, base, place, start }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = stateRef.current
      if (e.key >= '1' && e.key <= '9') s.place(Number(e.key))
      else if (e.key === ' ') {
        e.preventDefault()
        s.start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <AppShell name="Sudoku" icon="grid" meta="9 × 9">
      <div className="sud-heading">
        <h2 className="sud-title">Sudoku Puzzle</h2>
        <span role="timer" aria-label="Time" className="sud-timer">
          {time}
        </span>
      </div>

      <Card title="Board">
        <div className="sud-board lk-board" role="grid" aria-label="Board" style={boardVars}>
          {Array.from({ length: 9 }, (_, r) => (
            <div key={r} className="sud-row" role="row">
              {Array.from({ length: 9 }, (_, c) => {
                const i = r * 9 + c
                const v = record.board[i]
                return (
                  <button
                    key={i}
                    type="button"
                    role="gridcell"
                    aria-label={`Row ${r + 1}, Column ${c + 1}`}
                    aria-invalid={conflicts.has(i) ? 'true' : undefined}
                    data-row={r + 1}
                    data-col={c + 1}
                    data-value={v}
                    data-answer={record.given[i]}
                    data-selected={selected === i ? 'true' : undefined}
                    data-conflict={conflicts.has(i) ? 'true' : undefined}
                    className={
                      'sud-cell' +
                      (record.given[i] !== 0 ? ' sud-cell--given' : '') +
                      (selected === i ? ' sud-cell--selected' : '') +
                      (conflicts.has(i) ? ' sud-cell--invalid' : '')
                    }
                    onClick={() => select(i)}
                  >
                    <span className="sud-cell-val">{v || ''}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {statusText ? <Tag accent={statusText === 'Invalid move'}>{statusText}</Tag> : null}
      </Card>

      <Card title="Controls">
        <div className="sud-digits">
          {Array.from({ length: 9 }, (_, k) => k + 1).map((n) => (
            <Button
              key={n}
              ariaLabel={String(n)}
              style={{ width: 'calc(40px * var(--sf))', justifyContent: 'center' }}
              onClick={() => place(n)}
              disabled={status !== 'playing' || selected === null}
            >
              {n}
            </Button>
          ))}
        </div>
        <div className="sud-new">
          <label className="lc-field sud-field">
            <span className="lc-field-label" id="sud-difficulty">Difficulty</span>
            <select
              className="lc-input"
              id="sud-difficulty-select"
              aria-labelledby="sud-difficulty"
              value={difficulty}
              onChange={(event) => {
                const d = event.target.value as Difficulty
                setDifficulty(d)
                newGame(d)
              }}
            >
              <option value="Practice">Practice</option>
              <option value="Easy">Easy</option>
              <option value="Hard">Hard</option>
            </select>
          </label>
          <Button kind="primary" onClick={() => newGame(difficulty)}>
            New Game
          </Button>
        </div>
        <Keys
          items={[
            ['1–9', 'Fill the selected cell.'],
            ['Space', 'Start the timer.'],
          ]}
        />
      </Card>

      <Rail title="Game">
        <KpiRow>
          <Kpi label="Status" value={status === 'playing' ? 'playing' : status === 'finished' ? 'solved' : 'ready'} />
          <Kpi label="Difficulty" value={record.difficulty} />
        </KpiRow>
        {status === 'finished' ? <Tag accent>Solved in {time}</Tag> : null}
      </Rail>
    </AppShell>
  )
}
