import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button, Card, Stack } from '@lacuna/ui'
import { host } from './host'
import type { CellFlat, GameState, Level, Status } from './host'

const ROWS = 9
const COLS = 9
const MINES = 10

type Game = { level: Level; status: Status; elapsedMs: number }

function blankCells(): CellFlat[] {
  return Array.from({ length: ROWS * COLS }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    exploded: false,
    adj: 0,
  }))
}

function freshLevel(): Level {
  return dealMines(
    {
      rows: ROWS,
      cols: COLS,
      mines: MINES,
      cells: blankCells(),
      mineGenerated: false,
      revealedCount: 0,
      status: 'play',
    },
    -1,
    -1,
  )
}

function neighbors(r: number, c: number, rows: number, cols: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      out.push([nr, nc])
    }
  }
  return out
}

// Mines are dealt eagerly when the board is created (firstR < 0) so the DOM
// always exposes data-mine and adjacent counts, or lazily on the first click
// (firstR >= 0) keeping the clicked cell and its ring clear.
function dealMines(level: Level, firstR: number, firstC: number): Level {
  const { rows, cols, mines } = level
  const total = rows * cols
  const keep: boolean[] = new Array(total).fill(false)
  if (firstR >= 0) {
    keep[firstR * cols + firstC] = true
    for (const [nr, nc] of neighbors(firstR, firstC, rows, cols)) keep[nr * cols + nc] = true
  }

  const pool: number[] = []
  for (let i = 0; i < total; i++) if (!keep[i]) pool.push(i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const cells = level.cells.map((x) => ({ ...x }))
  const want = Math.min(mines, pool.length)
  for (let i = 0; i < want; i++) cells[pool[i]].mine = true

  for (let i = 0; i < total; i++) {
    cells[i].adj = neighbors(Math.floor(i / cols), i % cols, rows, cols).filter(
      ([nr, nc]) => cells[nr * cols + nc].mine,
    ).length
  }
  return { ...level, cells, mineGenerated: true }
}

function floodReveal(level: Level, r: number, c: number): Level {
  const { rows, cols } = level
  const cells = level.cells.map((x) => ({ ...x }))
  const stack: Array<[number, number]> = [[r, c]]
  let revealedCount = level.revealedCount
  while (stack.length) {
    const [cr, cc] = stack.pop()!
    const idx = cr * cols + cc
    const cell = cells[idx]
    if (cell.revealed || cell.flagged) continue
    cell.revealed = true
    revealedCount += 1
    if (cell.adj === 0 && !cell.mine) {
      for (const [nr, nc] of neighbors(cr, cc, rows, cols)) {
        if (!cells[nr * cols + nc].revealed) stack.push([nr, nc])
      }
    }
  }
  return { ...level, cells, revealedCount }
}

function reveal(level: Level, r: number, c: number): Level {
  const level2 = level.mineGenerated ? level : dealMines(level, r, c)
  const idx = r * level2.cols + c
  const cell = level2.cells[idx]
  if (cell.revealed || cell.flagged) return level2
  if (cell.mine) {
    const cells = level2.cells.map((x) => ({ ...x, revealed: x.mine ? true : x.revealed }))
    cells[idx].exploded = true
    cells[idx].revealed = true
    return { ...level2, cells, status: 'lost' }
  }
  return floodReveal(level2, r, c)
}

function countFlags(level: Level): number {
  return level.cells.reduce((a, b) => a + (b.flagged ? 1 : 0), 0)
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.min(99 * 60, Math.floor(ms / 1000)))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const rootStyle: CSSProperties = {
  minHeight: '100vh',
  padding: 'calc(24px * var(--sf))',
  boxSizing: 'border-box',
  background: 'var(--ui-bg)',
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
}

export function App() {
  const [game, setGame] = useState<Game>(() => {
    const saved = host.loadGame()
    if (saved.level && saved.level.cells && saved.level.cells.length === ROWS * COLS) {
      return { level: saved.level, status: saved.status, elapsedMs: saved.elapsedMs }
    }
    return { level: freshLevel(), status: 'play', elapsedMs: 0 }
  })
  const [bestMs, setBestMs] = useState<number>(() => host.loadBest())
  const startRef = useRef<number>(game.status === 'play' ? Date.now() : 0)

  // game.elapsedMs is the elapsed time frozen at the last persist; startRef is
  // the wall-clock instant that base was captured. While playing, display is
  // base + (now - startRef). The tick folds the running portion back into the
  // base and persists it, so a reload resumes from a non-zero elapsed time.

  const timerRunning = game.status === 'play'

  useEffect(() => {
    if (!timerRunning) return
    const t = window.setInterval(() => {
      setGame((g) => {
        if (g.status !== 'play' || !startRef.current) return g
        const base = g.elapsedMs + (Date.now() - startRef.current)
        startRef.current = Date.now()
        const next: Game = { ...g, elapsedMs: base }
        host.saveGame(next)
        return next
      })
    }, 250)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning])

  const elapsedMs =
    game.elapsedMs + (timerRunning && startRef.current ? Date.now() - startRef.current : 0)
  const displayMs = Math.min(99 * 60, Math.floor(elapsedMs / 1000)) * 1000

  const onLeft = useCallback((r: number, c: number) => {
    setGame((g) => {
      if (g.status === 'won' || g.status === 'lost') return g
      const idx = r * g.level.cols + c
      const cell = g.level.cells[idx]
      if (cell.revealed) return g
      if (cell.flagged) return g
      let level = reveal(g.level, r, c)
      const open = level.cells.filter((x) => !x.mine).length
      if (level.revealedCount >= open) {
        level = {
          ...level,
          status: 'won',
          cells: level.cells.map((x) => (x.mine ? { ...x, flagged: true } : x)),
        }
      }
      let best: number | null = null
      let base = g.elapsedMs
      if (level.status === 'won' || level.status === 'lost') {
        // game is over: fold the running portion into the stored base and stop
        if (startRef.current) {
          base += Date.now() - startRef.current
          startRef.current = 0
        }
        if (level.status === 'won') {
          host.saveBest(base)
          best = Math.min(host.loadBest(), base)
        }
      }
      const next: Game = { level, status: level.status, elapsedMs: base }
      host.saveGame(next)
      if (best !== null) setBestMs(best)
      return next
    })
  }, [])

  const onRight = useCallback((r: number, c: number) => {
    setGame((g) => {
      if (g.status === 'won' || g.status === 'lost') return g
      const idx = r * g.level.cols + c
      const cell = g.level.cells[idx]
      if (cell.revealed) return g
      const cells = g.level.cells.map((x) => ({ ...x }))
      cells[idx].flagged = !cells[idx].flagged
      const level = { ...g.level, cells }
      const next: Game = { level, status: g.status, elapsedMs: g.elapsedMs }
      host.saveGame(next)
      return next
    })
  }, [])

  const newGame = useCallback(() => {
    const g: Game = { level: freshLevel(), status: 'play', elapsedMs: 0 }
    startRef.current = Date.now()
    setGame(g)
    host.saveGame(g)
  }, [])

  const { level } = game
  const mineLeft = Math.max(0, level.mines - countFlags(level))

  const boardStyle: CSSProperties = {
    borderCollapse: 'separate',
    borderSpacing: 'calc(3px * var(--sf))',
    width: 'fit-content',
    margin: '0 auto',
  }

  const hudStyle: CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 'calc(13px * var(--tf))',
    letterSpacing: '0.4px',
    color: 'var(--ink)',
  }

  const cellStyle = (cell: CellFlat): CSSProperties => {
    const base: CSSProperties = {
      width: 'calc(26px * var(--sf))',
      height: 'calc(26px * var(--sf))',
      margin: 0,
      padding: 0,
      border: '1px solid var(--ui-line2)',
      borderRadius: 'calc(3px * var(--sf))',
      background: 'var(--ui-card)',
      color: 'var(--ink)',
      fontFamily: 'var(--mono)',
      fontSize: 'calc(13px * var(--tf))',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      lineHeight: 1,
      userSelect: 'none',
    }
    if (cell.revealed) {
      if (cell.mine) {
        base.background = cell.exploded ? 'var(--danger)' : 'var(--ui-bright)'
        base.color = cell.exploded ? 'var(--on-accent)' : 'var(--danger)'
        base.borderColor = 'var(--danger)'
      } else if (cell.adj === 0) {
        base.background = 'var(--ui-bright)'
        base.color = 'var(--ink-40)'
        base.borderColor = 'var(--ui-line)'
      } else {
        base.background = 'var(--ui-bright)'
        base.color = cell.adj === 3 ? 'var(--danger)' : 'var(--ink)'
        base.borderColor = 'var(--ui-line)'
      }
    } else if (cell.flagged) {
      base.background = 'var(--accent-soft)'
      base.color = 'var(--accent)'
      base.borderColor = 'var(--accent)'
    }
    return base
  }

  return (
    <div style={rootStyle}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <Stack lg>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'calc(12px * var(--sf))',
            }}
          >
            <h1 className="lc-title lc-title-xl" style={{ margin: 0 }}>
              Minesweeper Game
            </h1>
            <Button kind="primary" onClick={newGame}>
              New Game
            </Button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(16px * var(--sf))',
              flexWrap: 'wrap',
            }}
          >
            <div style={hudStyle}>Timer: {fmt(displayMs)}</div>
            <div style={hudStyle}>Mines: {mineLeft}</div>
            <div style={hudStyle}>Best Time: {bestMs > 0 ? fmt(bestMs) : '00:00'}</div>
            {game.status === 'lost' && <div style={{ ...hudStyle, color: 'var(--danger)' }}>Game Over</div>}
            {game.status === 'won' && <div style={{ ...hudStyle, color: 'var(--accent)' }}>You Win</div>}
          </div>

          <Card>
            <table role="table" aria-label={`board, ${level.rows} rows, ${level.cols} columns`} style={boardStyle}>
              <tbody>
                {Array.from({ length: level.rows }, (_, row) => (
                  <tr key={row} role="row">
                    {Array.from({ length: level.cols }, (_, col) => {
                      const i = row * level.cols + col
                      const cell = level.cells[i]
                      const name = cell.flagged
                        ? `flagged, row ${row + 1}, column ${col + 1}`
                        : cell.revealed
                          ? `revealed, ${cell.mine ? 'mine' : String(cell.adj)}, row ${row + 1}, column ${col + 1}`
                          : `hidden, row ${row}, column ${col}`
                      return (
                        <td
                          key={col}
                          role="cell"
                          aria-label={name}
                          data-row={row}
                          data-col={col}
                          data-count={cell.revealed && !cell.mine ? String(cell.adj) : undefined}
                          data-revealed={cell.revealed ? 'true' : undefined}
                          data-flag={cell.flagged || undefined}
                          data-mine={cell.mine || undefined}
                          onClick={() => onLeft(row, col)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            onRight(row, col)
                          }}
                          style={cellStyle(cell)}
                        >
                          {cell.revealed ? (cell.mine ? 'X' : String(cell.adj)) : cell.flagged ? '\u{1F1CF}' : ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Stack>
      </div>
    </div>
  )
}

export default App
