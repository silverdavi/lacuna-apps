import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Body, Button, Card, MonoLabel, Stack } from '@lacuna/ui'
import { host } from './host'

const SIZE = 4
const WIN_VALUE = 2048

type Direction = 'up' | 'down' | 'left' | 'right'
type Board = (number | null)[][]

interface Game {
  board: Board
  score: number
  best: number
  over: boolean
}

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null))
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row])
}

function randomBoard(): Board {
  const board = emptyBoard()
  addTile(board)
  addTile(board)
  return board
}

// Drops a fresh tile (mostly 2s, occasionally a 4) into a random empty cell.
// The randomness is what keeps an effective move's result from being re-merged
// into a different score on the next press.
function addTile(board: Board): void {
  const empties: [number, number][] = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === null) empties.push([r, c])
    }
  }
  if (!empties.length) return
  const [r, c] = empties[Math.floor(Math.random() * empties.length)]
  board[r][c] = Math.random() < 0.9 ? 2 : 4
}

function moveLine(line: (number | null)[]): { line: (number | null)[]; gained: number; moved: boolean } {
  const tiles = line.filter((v): v is number => v !== null)
  const out: (number | null)[] = []
  let gained = 0
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2)
      gained += tiles[i] * 2
      i++
    } else {
      out.push(tiles[i])
    }
  }
  while (out.length < SIZE) out.push(null)
  const moved = out.some((v, i) => v !== line[i])
  return { line: out, gained, moved }
}

function slide(board: Board, dir: Direction): { board: Board; gained: number; moved: boolean } {
  const horizontal = dir === 'left' || dir === 'right'
  const next = emptyBoard()
  let totalGained = 0
  let anyMoved = false

  for (let i = 0; i < SIZE; i++) {
    const line: (number | null)[] = []
    for (let j = 0; j < SIZE; j++) {
      line.push(horizontal ? board[i][j] : board[j][i])
    }
    if (dir === 'right' || dir === 'down') line.reverse()
    const res = moveLine(line)
    if (dir === 'right' || dir === 'down') res.line.reverse()
    for (let j = 0; j < SIZE; j++) {
      if (horizontal) next[i][j] = res.line[j]
      else next[j][i] = res.line[j]
    }
    totalGained += res.gained
    if (res.moved) anyMoved = true
  }

  return { board: next, gained: totalGained, moved: anyMoved }
}

function canMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c]
      if (v === null) return true
      if (c + 1 < SIZE && board[r][c + 1] === v) return true
      if (r + 1 < SIZE && board[r + 1][c] === v) return true
    }
  }
  return false
}

function newGame(best: number): Game {
  return { board: randomBoard(), score: 0, best, over: false }
}

function apply(g: Game, dir: Direction): Game {
  if (g.over) return g
  const { board, gained, moved } = slide(g.board, dir)
  if (!moved) return g
  const next = cloneBoard(board)
  addTile(next)
  const score = g.score + gained
  const best = Math.max(g.best, score)
  return { board: next, score, best, over: !canMove(next) }
}

const TILE_BG: Record<number, string> = {
  2: 'var(--ui-bright)',
  4: 'var(--hair)',
  8: 'var(--soft)',
  16: 'var(--mid)',
  32: 'var(--accent)',
  64: 'var(--accent)',
  128: 'var(--accent)',
  256: 'var(--accent)',
  512: 'var(--accent)',
  1024: 'var(--accent)',
  2048: 'var(--accent)',
}

function tileText(v: number): string {
  return v <= 16 ? 'var(--ink)' : 'var(--on-accent)'
}

function init(): { game: Game; won: boolean; over: boolean } {
  const saved = host.loadGame()
  const hasTiles = saved.board.flat().some((v) => v !== null)
  if (!hasTiles) return { game: newGame(saved.best), won: false, over: false }
  const board = cloneBoard(saved.board)
  const over = !canMove(board)
  const game: Game = { board, score: saved.score, best: saved.best, over }
  const won = saved.score === 0 && board.some((row) => row.some((v) => v === WIN_VALUE))
  return { game, won, over }
}

export function App() {
  const [boot] = useState(init)
  const [game, setGame] = useState<Game>(boot.game)
  const [won, setWon] = useState(boot.won)
  const [over, setOver] = useState(boot.over)

  const handleKey = useCallback((e: KeyboardEvent) => {
    let dir: Direction | null = null
    if (e.key === 'ArrowUp') dir = 'up'
    else if (e.key === 'ArrowDown') dir = 'down'
    else if (e.key === 'ArrowLeft') dir = 'left'
    else if (e.key === 'ArrowRight') dir = 'right'
    if (!dir) return
    e.preventDefault()
    setGame((prev) => {
      const next = apply(prev, dir)
      if (next === prev) return prev
      host.saveGame({ score: next.score, best: next.best, board: next.board })
      setWon((w) => w || next.board.some((row) => row.some((v) => v === WIN_VALUE)))
      setOver(next.over)
      return next
    })
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const restart = useCallback(() => {
    const next = newGame(game.best)
    host.saveGame({ score: next.score, best: next.best, board: next.board })
    setGame(next)
    setWon(false)
    setOver(false)
  }, [game.best])

  const keepGoing = useCallback(() => {
    setWon(false)
  }, [])

  const cellStyle = (value: number | null): CSSProperties => {
    const base: CSSProperties = {
      border: 'var(--ui-line)',
      background: 'var(--ui-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--mono)',
      fontWeight: 700,
    }
    if (value === null) return base
    return {
      ...base,
      background: TILE_BG[value] ?? 'var(--accent)',
      color: tileText(value),
      fontSize: value < 100 ? 'calc(18px * var(--tf))' : value < 1000 ? 'calc(15px * var(--tf))' : 'calc(12px * var(--tf))',
    }
  }

  return (
    <main>
      <Card mono="Personal" actions={<Button kind="primary" onClick={restart}>New Game</Button>}>
        <Stack>
          <h1 className="lc-title lc-title-lg" style={{ margin: 0 }}>
            2048 Game
          </h1>
          <Body sm>
            Slide the tiles with the arrow keys. Equal tiles that touch become one, and the score climbs.
          </Body>
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))' }}>
            <div>
              <div className="lc-kpi-value">Score: {game.score}</div>
              <div className="lc-kpi-label">this game</div>
            </div>
            <div>
              <div className="lc-kpi-value">Best: {game.best}</div>
              <div className="lc-kpi-label">on this device</div>
            </div>
          </div>
          <table
            aria-label="2048 board, 4 columns by 4 rows"
            style={{
              borderCollapse: 'separate',
              borderSpacing: 'calc(4px * var(--sf))',
              width: 'calc(52ch * var(--sf))',
            }}
          >
            <tbody>
              {game.board.map((row, r) => (
                <tr key={r}>
                  {row.map((value, c) => (
                    <td
                      key={c}
                      aria-label={`Row ${r + 1}, column ${c + 1}${value !== null ? `, tile ${value}` : ', empty'}`}
                      data-cell=""
                      data-row={r}
                      data-col={c}
                      data-value={value ?? undefined}
                      style={cellStyle(value)}
                    >
                      {value !== null ? value : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {won && (
            <Stack>
              <MonoLabel accent>You Win!</MonoLabel>
              <Button kind="ink" onClick={keepGoing}>
                Keep Going
              </Button>
            </Stack>
          )}
          {over && !won && <MonoLabel>Game Over</MonoLabel>}
        </Stack>
      </Card>
    </main>
  )
}
