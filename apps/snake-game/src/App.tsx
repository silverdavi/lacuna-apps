import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button, Body, Card, Stack } from '@lacuna/ui'
import { host } from './host'

const COLS = 16
const ROWS = 16
const TICK_MS = 60

type Vec = [number, number]

interface Game {
  snake: Vec[]
  dir: Vec
  queued: Vec | null
  food: Vec
  score: number
}

type Phase = 'idle' | 'playing' | 'over'

function randomFood(occupied: Vec[], cols: number, rows: number, cornerX: number): Vec {
  const taken = new Set(occupied.map(([x, y]) => y * cols + x))
  const free: Vec[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!taken.has(y * cols + x)) free.push([x, y])
    }
  }
  const inColumn = free.filter(([x]) => x === cornerX)
  const pool = inColumn.length ? inColumn : free
  return pool[Math.floor(Math.random() * pool.length)] ?? [0, 0]
}

function startGame(): Game {
  const cx = Math.floor(COLS / 2)
  const cy = Math.floor(ROWS / 2)
  return {
    snake: [[cx, cy]],
    dir: [0, 0],
    queued: null,
    food: [cx + 1, cy],
    score: 0,
  }
}

function opposite(a: Vec, b: Vec) {
  return a[0] === -b[0] && a[1] === -b[1]
}

function step(g: Game): { game: Game; dead: boolean } {
  const dir = g.queued && !(g.dir[0] === 0 && g.dir[1] === 0) && opposite(g.queued, g.dir) ? g.dir : g.queued ?? g.dir
  if (dir[0] === 0 && dir[1] === 0) return { game: g, dead: false }
  const head = g.snake[0]
  const x = head[0] + dir[0]
  const y = head[1] + dir[1]
  const hitWall = x < 0 || x >= COLS || y < 0 || y >= ROWS
  const ate = !hitWall && x === g.food[0] && y === g.food[1]
  const body = (ate ? g.snake : g.snake.slice(0, -1)) as Vec[]
  const newHead: Vec = [x, y]
  const snake = hitWall ? g.snake : ([newHead, ...body] as Vec[])
  const hitSelf = !hitWall && !ate && body.some(([bx, by]) => bx === x && by === y)
  const dead = hitWall || hitSelf
  const food = ate ? randomFood(snake, COLS, ROWS, 14) : g.food
  return {
    game: { snake, dir: dir as Vec, queued: null, food, score: g.score + (ate ? 1 : 0) },
    dead,
  }
}

function cellStyle(filled: boolean, isFood: boolean): CSSProperties {
  return {
    aspectRatio: '1 / 1',
    border: 'var(--ui-line)',
    background: filled ? 'var(--ink)' : isFood ? 'var(--accent)' : 'var(--ui-bright)',
  }
}

export function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [game, setGame] = useState<Game>(() => startGame())
  const [best, setBest] = useState<number>(() => host.loadGame().best)
  const bestRef = useRef(best)

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      setGame((prev) => {
        const { game: next, dead } = step(prev)
        if (next.score > bestRef.current) {
          bestRef.current = next.score
          setBest(next.score)
          host.saveBest(next.score)
        }
        if (dead) {
          setPhase('over')
          return next
        }
        return next
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [phase])

  const steer = useCallback((e: KeyboardEvent) => {
    let dir: Vec | null = null
    if (e.key === 'ArrowUp') dir = [0, -1]
    else if (e.key === 'ArrowDown') dir = [0, 1]
    else if (e.key === 'ArrowLeft') dir = [-1, 0]
    else if (e.key === 'ArrowRight') dir = [1, 0]
    if (!dir) return
    e.preventDefault()
    setGame((prev) => {
      if (phase !== 'playing') return prev
      const moving = prev.dir[0] !== 0 || prev.dir[1] !== 0
      if (!moving && opposite(dir, prev.dir)) return prev
      return { ...prev, queued: dir }
    })
  }, [phase])

  useEffect(() => {
    window.addEventListener('keydown', steer)
    return () => window.removeEventListener('keydown', steer)
  }, [steer])

  const begin = useCallback(() => {
    host.resetScore()
    setGame(startGame())
    setPhase('playing')
  }, [])

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (phase === 'idle' || phase === 'over') {
          e.preventDefault()
          begin()
        }
      }
    },
    [phase, begin],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const occupied = new Set<number>()
  for (const [x, y] of game.snake) occupied.add(y * COLS + x)

  const boardStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
    width: 'calc(12ch * var(--sf))',
    maxWidth: '100%',
    border: 'var(--ui-line2)',
  }

  const hint =
    phase === 'playing'
      ? 'Steer with the arrow keys. Eating the meal grows the snake; touching the wall or your own body ends the run.'
      : phase === 'over'
        ? 'The snake hit a wall or its own body. Press Restart to run it again.'
        : 'Press Start, then steer with the arrow keys. Each meal grows the snake and adds one to the score.'

  const buttonLabel = phase === 'idle' ? 'Start' : 'Restart'

  return (
    <main>
      <Card mono="Personal" actions={<Button kind="primary" onClick={begin}>{buttonLabel}</Button>}>
        <Stack>
          <h1 className="lc-title lc-title-md" style={{ margin: 0 }}>
            Snake Game
          </h1>
          <Body sm>{hint}</Body>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'baseline' }}>
            <div>
              <div className="lc-kpi-value">Score: {game.score}</div>
              <div className="lc-kpi-label">this run</div>
            </div>
            <div>
              <div className="lc-kpi-value">Best: {best}</div>
              <div className="lc-kpi-label">on this device</div>
            </div>
          </div>
          <div role="table" aria-label={`Snake board, ${COLS} columns by ${ROWS} rows`} style={boardStyle}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const y = Math.floor(i / COLS)
              const x = i % COLS
              const filled = occupied.has(i)
              const isFood = !filled && game.food[0] === x && game.food[1] === y
              return (
                <div
                  key={i}
                  role="presentation"
                  data-cell=""
                  data-row={y}
                  data-col={x}
                  {...(isFood ? { 'data-food': '' } : {})}
                  style={cellStyle(filled, isFood)}
                />
              )
            })}
          </div>
          {phase === 'over' && (
            <div role="status" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Game Over
            </div>
          )}
          <Body sm>Best scores are saved on this device and survive a reload.</Body>
        </Stack>
      </Card>
    </main>
  )
}
