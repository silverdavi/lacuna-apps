import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AppShell, Button, Body, Card, Stack } from '@lacuna/ui'
import { host } from './host'
import { COLS, ROWS, createGame, queueDirection, stepGame, type Game, type Vec } from './engine'

const TICK_MS = 60

function cellStyle(filled: boolean, isFood: boolean): CSSProperties {
  return {
    aspectRatio: '1 / 1',
    border: 'var(--ui-line)',
    background: filled ? 'var(--ink)' : isFood ? 'var(--accent)' : 'var(--ui-bright)',
  }
}

export function App() {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'over'>('idle')
  const [game, setGame] = useState<Game>(() => createGame())
  const [best, setBest] = useState<number>(() => host.loadGame().best)
  const bestRef = useRef(best)

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      setGame((prev) => {
        const { game: next, dead } = stepGame(prev, Math.random())
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

  const steer = useCallback(
    (e: KeyboardEvent) => {
      let dir: Vec | null = null
      if (e.key === 'ArrowUp') dir = [0, -1]
      else if (e.key === 'ArrowDown') dir = [0, 1]
      else if (e.key === 'ArrowLeft') dir = [-1, 0]
      else if (e.key === 'ArrowRight') dir = [1, 0]
      if (!dir) return
      e.preventDefault()
      setGame((prev) => {
        if (phase !== 'playing') return prev
        return queueDirection(prev, dir)
      })
    },
    [phase],
  )

  useEffect(() => {
    window.addEventListener('keydown', steer)
    return () => window.removeEventListener('keydown', steer)
  }, [steer])

  const begin = useCallback(() => {
    host.resetScore()
    setGame(createGame())
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
    <AppShell name="Snake Game" icon="grid" hue="green" category="Personal">
      <Card mono="Personal" actions={<Button kind="primary" onClick={begin}>{buttonLabel}</Button>}>
        <Stack>
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
    </AppShell>
  )
}
