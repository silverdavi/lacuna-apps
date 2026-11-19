import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Body, Button, Card, MonoLabel, Stack } from '@lacuna/ui'
import { host } from './host'

const SIZE = 4
const WIN_VALUE = 2048
const NEW_GAME_ATTEMPTS = 40
const PLAY_MOVES_PER_ROUND = 40

type Direction = 'up' | 'down' | 'left' | 'right'
type Board = (number | null)[][]

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function startBoard(): Board {
  const b = emptyBoard()
  const cells = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE] as [number, number]),
  )
  b[cells[0][0]][cells[0][1]] = 2
  b[cells[1][0]][cells[1][1]] = 2
  return b
}

function drop(board: Board): Board {
  const next = board.map((row) => [...row])
  const empties: [number, number][] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (next[r][c] === null) empties.push([r, c])
  if (empties.length === 0) return next
  const [r, c] = empties[Math.floor(Math.random() * empties.length)]
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function slide(board: Board, dir: Direction): { board: Board; gained: number; moved: boolean } {
  const next = emptyBoard()
  let gained = 0
  let moved = false
  for (let i = 0; i < SIZE; i++) {
    const line: (number | null)[] = []
    for (let j = 0; j < SIZE; j++) line.push(dir === 'down' || dir === 'up' ? board[j][i] : board[i][j])
    if (dir === 'right' || dir === 'down') line.reverse()
    const tiles = line.filter((v): v is number => v !== null)
    const out: (number | null)[] = []
    for (let k = 0; k < tiles.length; k++) {
      if (k + 1 < tiles.length && tiles[k] === tiles[k + 1]) {
        out.push(tiles[k] * 2)
        gained += tiles[k] * 2
        k++
      } else {
        out.push(tiles[k])
      }
    }
    while (out.length < SIZE) out.push(null)
    if (dir === 'right' || dir === 'down') out.reverse()
    for (let j = 0; j < SIZE; j++) {
      const target = dir === 'down' || dir === 'up' ? [j, i] : [i, j]
      if (next[target[0]][target[1]] !== out[j]) moved = true
      next[target[0]][target[1]] = out[j]
    }
  }
  return { board: next, gained, moved }
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

const TILE_FILL: Record<number, string> = {
  2: 'var(--ui-bright)',
  4: 'var(--soft)',
  8: 'var(--mid)',
  16: 'var(--accent-soft)',
  32: 'var(--accent)',
  64: 'var(--accent)',
  128: 'var(--accent)',
  256: 'var(--accent)',
  512: 'var(--accent)',
  1024: 'var(--accent)',
  2048: 'var(--accent)',
}

function tileColor(v: number): string {
  return v <= 16 ? 'var(--ink)' : 'var(--on-accent)'
}

function cellStyle(value: number | null): CSSProperties {
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
    background: TILE_FILL[value] ?? 'var(--accent)',
    color: tileColor(value),
    fontSize: value < 100 ? 'calc(18px * var(--tf))' : value < 1000 ? 'calc(15px * var(--tf))' : 'calc(12px * var(--tf))',
  }
}

type Status = 'playing' | 'won' | 'over'

type Snapshot = { board: Board; score: number; best: number; status: Status }

export function App() {
  const saved = host.loadGame()
  const storedBoard = saved.board.some((row) => row.some((v) => v !== null)) ? saved.board : null
  const freshStart = startBoard()
  const [snap, setSnap] = useState<Snapshot>(() => {
    if (storedBoard) {
      const status: Status = !canMove(storedBoard) ? 'over' : saved.score >= WIN_VALUE ? 'won' : 'playing'
      return { board: storedBoard, score: saved.score, best: Math.max(saved.best, saved.score), status }
    }
    return { board: freshStart, score: 0, best: saved.best, status: 'playing' }
  })
  const snapRef = useRef(snap)
  const keyQueue = useRef<string[]>([])

  const commit = useCallback((board: Board, gained: number) => {
    const cur = snapRef.current
    const score = cur.score + gained
    const best = Math.max(cur.best, score)
    const finalBoard = drop(board)
    const status: Status = !canMove(finalBoard) ? 'over' : score >= WIN_VALUE ? 'won' : 'playing'
    const next = { board: finalBoard, score, best, status }
    snapRef.current = next
    setSnap(next)
    if (gained > 0) host.saveGame({ score, best, board: finalBoard })
  }, [])

  const applyMove = useCallback(
    (dir: Direction) => {
      const cur = snapRef.current
      if (cur.status === 'over') return
      const res = slide(cur.board, dir)
      if (!res.moved) return
      commit(res.board, res.gained)
    },
    [commit],
  )

  const handleKey = useCallback(
    (e: KeyboardEvent): void => {
      let dir: Direction | null = null
      if (e.key === 'ArrowUp') dir = 'up'
      else if (e.key === 'ArrowDown') dir = 'down'
      else if (e.key === 'ArrowLeft') dir = 'left'
      else if (e.key === 'ArrowRight') dir = 'right'
      if (!dir) return
      e.preventDefault()
      keyQueue.current.push(dir)
      const cur = snapRef.current
      if (cur.status === 'won') {
        const wonBoard = cur.board
        const tries: (b: Board, score: number) => boolean = (b, score) =>
          score >= WIN_VALUE || b.some((row) => row.some((v) => v === WIN_VALUE))
        let board = wonBoard
        let score = cur.score
        for (let i = 0; i < NEW_GAME_ATTEMPTS && !tries(board, score); i++) {
          const d: Direction = keyQueue.current[i % keyQueue.current.length] ?? 'up'
          const res = slide(board, d)
          if (!res.moved) continue
          score += res.gained
          board = drop(res.board)
        }
        if (tries(board, score)) {
          const next = { ...cur, board, score, best: Math.max(cur.best, score), status: 'playing' as Status }
          snapRef.current = next
          setSnap(next)
          host.saveGame({ score, best: next.best, board })
          keyQueue.current = []
          return
        }
        return
      }
      while (keyQueue.current.length > 0) {
        const d = keyQueue.current.shift()!
        applyMove(d)
      }
    },
    [applyMove],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const restart = useCallback(() => {
    let start = startBoard()
    for (let i = 0; i < NEW_GAME_ATTEMPTS && !canMove(start); i++) start = startBoard()
    const cur = snapRef.current
    const next = { board: start, score: 0, best: cur.best, status: 'playing' as Status }
    snapRef.current = next
    setSnap(next)
    keyQueue.current = []
  }, [])

  const keepGoing = useCallback(() => {
    const cur = snapRef.current
    const next = { ...cur, status: 'playing' as Status }
    snapRef.current = next
    setSnap(next)
    keyQueue.current = []
  }, [])

  const { board, score, best, status } = snap

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
              <div className="lc-kpi-value">Score: {score}</div>
              <div className="lc-kpi-label">this game</div>
            </div>
            <div>
              <div className="lc-kpi-value">Best: {best}</div>
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
              {board.map((row, r) => (
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
          {status === 'won' && (
            <Stack>
              <MonoLabel accent>You Win!</MonoLabel>
              <Button kind="ink" onClick={keepGoing}>
                Keep Going
              </Button>
            </Stack>
          )}
          {status === 'over' && <MonoLabel>Game Over</MonoLabel>}
        </Stack>
      </Card>
    </main>
  )
}
