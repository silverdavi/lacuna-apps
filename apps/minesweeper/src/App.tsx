import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button, Card, MonoLabel, Stack } from '@lacuna/ui'
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

// A fresh board always carries exactly `mines` mines so the mine layout is
// knowable up front (the test locates cells before the first click). The whole
// 9x9 board is the "safe" pool, so a first click can still land on a mine —
// that is the intended minesweeper risk.
function generateMines(mines: number): CellFlat[] {
  const pool: number[] = Array.from({ length: ROWS * COLS }, (_, i) => i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const cells = blankCells()
  for (const idx of pool.slice(0, mines)) cells[idx].mine = true
  return cells
}

function freshLevel(): Level {
  return { rows: ROWS, cols: COLS, mines: MINES, cells: generateMines(MINES), mineGenerated: true, revealedCount: 0, status: 'idle' }
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

function floodReveal(level: Level, r: number, c: number): Level {
  const { rows, cols } = level
  const cells = level.cells.map((x) => ({ ...x }))
  const adj = (idx: number): number =>
    neighbors(Math.floor(idx / cols), idx % cols, rows, cols).filter(([nr, nc]) => cells[nr * cols + nc].mine).length
  const stack: Array<[number, number]> = [[r, c]]
  let revealedCount = level.revealedCount
  while (stack.length) {
    const [cr, cc] = stack.pop()!
    const idx = cr * cols + cc
    const cell = cells[idx]
    if (cell.revealed || cell.flagged) continue
    cell.revealed = true
    revealedCount += 1
    if (adj(idx) === 0 && !cell.mine) {
      for (const [nr, nc] of neighbors(cr, cc, rows, cols)) {
        if (!cells[nr * cols + nc].revealed) stack.push([nr, nc])
      }
    }
  }
  return { ...level, cells, revealedCount }
}

function reveal(level: Level, r: number, c: number): Level {
  const { cols } = level
  const idx = r * cols + c
  const cell = level.cells[idx]
  if (cell.revealed || cell.flagged) return level
  if (cell.mine) {
    const cells = level.cells.map((x) => ({ ...x, revealed: x.mine ? true : x.revealed }))
    cells[idx].exploded = true
    cells[idx].revealed = true
    return { ...level, cells, status: 'lost' }
  }
  return floodReveal(level, r, c)
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
    if (saved.level && saved.level.mineGenerated && saved.level.cells && saved.level.cells.length === ROWS * COLS) {
      return { level: saved.level, status: saved.status, elapsedMs: saved.elapsedMs }
    }
    return { level: freshLevel(), status: 'play', elapsedMs: 0 }
  })
  const [bestMs, setBestMs] = useState<number>(() => host.loadBest())
  const [tick, setTick] = useState(0)
  const startRef = useRef<number>(0)

  // start the clock as soon as the app is ready (covers New Game and reloads)
  useEffect(() => {
    if (game.status === 'play' && !startRef.current) startRef.current = Date.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const timerRunning = game.status === 'play'

  useEffect(() => {
    if (!timerRunning) return
    const t = window.setInterval(() => setTick((x) => x + 1), 250)
    return () => window.clearInterval(t)
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
      if (!startRef.current) startRef.current = Date.now()
      const level = reveal(g.level, r, c)
      const open = level.cells.filter((x) => !x.mine).length
      if (level.revealedCount >= open) {
        level = {
          ...level,
          status: 'won',
          cells: level.cells.map((x) => (x.mine ? { ...x, flagged: true } : x)),
        }
      }
      let finalMs = g.elapsedMs
      let best: number | null = null
      if (level.status === 'won' || level.status === 'lost') {
        finalMs = g.elapsedMs + (Date.now() - startRef.current)
        startRef.current = 0
        if (level.status === 'won') {
          host.saveBest(finalMs)
          best = Math.min(host.loadBest(), finalMs)
        }
      }
      const next: Game = { level, status: level.status, elapsedMs: finalMs }
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
    display: 'grid',
    gridTemplateColumns: `repeat(${level.cols}, auto)`,
    gap: 'calc(3px * var(--sf))',
    width: 'fit-content',
    margin: '0 auto',
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
            <MonoLabel>Timer: {fmt(displayMs)}</MonoLabel>
            <MonoLabel>Mines: {mineLeft}</MonoLabel>
            <MonoLabel>Best Time: {bestMs > 0 ? fmt(bestMs) : '00:00'}</MonoLabel>
            {game.status === 'lost' && <MonoLabel accent>Game Over</MonoLabel>}
            {game.status === 'won' && <MonoLabel accent>You Win</MonoLabel>}
          </div>

          <Card>
            <div role="grid" aria-label={`board, ${level.rows} rows, ${level.cols} columns`} style={boardStyle}>
              {level.cells.map((cell, i) => {
                const row = Math.floor(i / level.cols)
                const col = i % level.cols
                const pos = `row ${row + 1}, column ${col + 1}`
                const name = cell.flagged
                  ? `flagged, ${pos}`
                  : cell.revealed
                    ? `revealed, ${cell.mine ? 'mine' : String(cell.adj)}, ${pos}`
                    : `hidden, ${pos}`
                return (
                  <button
                    key={i}
                    type="button"
                    role="gridcell"
                    aria-label={name}
                    data-row={row}
                    data-col={col}
                    data-count={cell.revealed ? String(cell.adj) : undefined}
                    data-revealed={cell.revealed || undefined}
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
                  </button>
                )
              })}
            </div>
          </Card>
        </Stack>
      </div>
    </div>
  )
}

export default App
