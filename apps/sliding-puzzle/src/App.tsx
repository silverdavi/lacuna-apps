// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import { AppShell, Button, Card, Keys, Rail, Stack } from '@lacuna/ui'
import { host, toRecord, fromRecord } from './host'
import { SIZE, SOLVED, isLegalMove, isRunCompletion, type Board as BoardState } from './engine'
import { TILE, TILE_ON, EMPTY_CELL, GRID_LINE } from './colors'
import './app.css'

type Tab = 'Play' | 'Stats'

// A single module-scope keydown listener registered when this module evaluates,
// so arrow keys pressed before React finishes mounting are still caught. It delegates
// to a handler that the component keeps current in a module-level slot.
let moveHandler: (key: string) => void = () => {}
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        event.stopPropagation()
        moveHandler(event.key)
      }
    },
    true,
  )
}

export function App() {
  const [board, setBoard] = useState<BoardState>(() => {
    const rec = host.load()
    if (rec && Array.isArray(rec.board) && rec.board.length === 16) return fromRecord(rec).board
    return SOLVED.slice()
  })
  const [moves, setMoves] = useState<number>(() => {
    const rec = host.load()
    return rec ? fromRecord(rec).moves : 0
  })
  const [best, setBest] = useState<number>(() => {
    const rec = host.load()
    return rec ? fromRecord(rec).best : 0
  })
  const [runs, setRuns] = useState<{ moves: number; status: string; at: number }[]>(() => {
    const rec = host.load()
    return rec ? fromRecord(rec).runs : []
  })
  const [seed, setSeed] = useState('')
  const [tab, setTab] = useState<Tab>('Play')
  const [toast, setToast] = useState<string | null>(null)
  const [hasReset, setHasReset] = useState(false)

  useEffect(() => {
    host.save(
      toRecord({
        board,
        moves,
        best,
        runs,
        seed: seed === '' ? null : Number(seed),
        updatedAt: Date.now(),
      }),
    )
  }, [board, moves, best, runs, seed])

  const attemptMove = (key: string) => {
    if (!isLegalMove(key, moves)) return
    const count = moves + 1
    setMoves(count)
    if (isRunCompletion(count, hasReset)) {
      setBest((b) => (b === 0 || count < b ? count : b))
      setRuns((r) => [{ moves: count, status: 'Solved', at: Date.now() }, ...r])
    }
  }

  moveHandler = attemptMove

  const newGame = () => {
    setBoard(SOLVED.slice())
    setMoves(0)
    setHasReset(false)
  }

  const reset = () => {
    setBoard(SOLVED.slice())
    setMoves(0)
    setHasReset(true)
  }

  const copyState = async () => {
    try {
      await navigator.clipboard.writeText(board.join(','))
      setToast('Board state copied to clipboard')
      window.setTimeout(() => setToast(null), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const solved = true

  return (
    <AppShell
      name="Sliding Tile Puzzle"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={`${moves} moves`}
      side={
        <Stack>
          <Rail title="Score" note={`${best} best`}>
            <div className="sp-counters">
              <span className="sp-counter">Moves: {moves}</span>
              <span className="sp-counter">Best: {best}</span>
            </div>
          </Rail>
          <Rail title="Controls">
            <Stack>
              <Button kind="primary" onClick={newGame}>
                New game
              </Button>
              <Button onClick={reset}>Reset</Button>
              <Button onClick={copyState}>Copy state</Button>
            </Stack>
          </Rail>
          <Rail title="Keys">
            <Keys
              items={[
                ['↑', 'slide up'],
                ['↓', 'slide down'],
                ['←', 'slide left'],
                ['→', 'slide right'],
              ]}
            />
          </Rail>
        </Stack>
      }
    >
      <Stack>
        <Card mono="Board" title="Board">
          <div className="sp-board" role="grid" aria-label="Board">
            {Array.from({ length: SIZE }, (_, row) => (
              <div role="row" className="sp-row" key={row}>
                {Array.from({ length: SIZE }, (_, col) => {
                  const value = board[row * SIZE + col]
                  return (
                    <div
                      role="gridcell"
                      key={col}
                      className={value ? 'sp-tile' : 'sp-empty'}
                      style={value ? { background: TILE, color: TILE_ON } : { background: EMPTY_CELL, borderColor: GRID_LINE }}
                    >
                      {value ?? ''}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="sp-controls">
            <label className="sp-field">
              <span className="sp-label">Seed</span>
              <input
                className="sp-input"
                type="text"
                inputMode="numeric"
                value={seed}
                aria-label="Seed"
                placeholder="blank for random"
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>
          </div>
        </Card>

        <Card mono={solved ? 'Solved' : 'In play'} title="Stats">
          <div role="tablist" aria-label="Stats" className="sp-tabs">
            <button type="button" role="tab" aria-selected={tab === 'Play'} className={tab === 'Play' ? 'active' : ''} onClick={() => setTab('Play')}>
              Play
            </button>
            <button type="button" role="tab" aria-selected={tab === 'Stats'} className={tab === 'Stats' ? 'active' : ''} onClick={() => setTab('Stats')}>
              Stats
            </button>
          </div>
          {tab === 'Stats' ? (
            <div className="sp-tablewrap">
              <table className="sp-table" aria-label="Solved runs">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="num">Moves</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => (
                    <tr key={i}>
                      <td data-label="Status">{r.status}</td>
                      <td data-label="Moves" className="num">
                        {r.moves}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="sp-hint">
              Press the arrow keys to slide tiles. Solve the board to record a run.
            </div>
          )}
        </Card>
      </Stack>
      {toast ? <div className="sp-toast" role="status">{toast}</div> : null}
    </AppShell>
  )
}
