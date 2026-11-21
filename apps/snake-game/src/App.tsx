import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  Keys,
  Rail,
  Stack,
  Tag,
} from '@lacuna/ui'
import { FOOD, SNAKE } from './colors'
import { host } from './host'
import { COLS, ROWS, createGame, queueDirection, stepGame, type Game, type Vec } from './engine'

const TICK_MS = 60
type Phase = 'idle' | 'playing' | 'over'

type Steer = (e: KeyboardEvent) => void

// One keydown listener, attached once at module scope, that calls the handler the
// component sets on every render. Attaching inside useEffect misses a key pressed
// the instant the page has loaded; the tests press keys immediately.
let steerRef: Steer | null = null
window.addEventListener('keydown', (e) => steerRef?.(e))

export function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [game, setGame] = useState<Game>(() => createGame())
  const [best, setBest] = useState<number>(() => host.loadGame().best)
  const bestRef = useRef(best)

  // A keypress does not move the snake until a run is in progress.
  steerRef = (e: KeyboardEvent) => {
    if (phase !== 'playing') return
    let dir: Vec | null = null
    if (e.key === 'ArrowUp') dir = [0, -1]
    else if (e.key === 'ArrowDown') dir = [0, 1]
    else if (e.key === 'ArrowLeft') dir = [-1, 0]
    else if (e.key === 'ArrowRight') dir = [1, 0]
    if (!dir) return
    e.preventDefault()
    setGame((prev) => queueDirection(prev, dir))
  }

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
        if (dead) setPhase('over')
        return next
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [phase])

  const begin = () => {
    setGame(createGame())
    setPhase('playing')
  }

  const occupied = new Set<number>()
  for (const [x, y] of game.snake) occupied.add(y * COLS + x)

  const cells: ReactElement[] = []
  for (let i = 0; i < ROWS * COLS; i++) {
    const y = Math.floor(i / COLS)
    const x = i % COLS
    const filled = occupied.has(i)
    const isFood = !filled && game.food[0] === x && game.food[1] === y
    const background = filled ? SNAKE : isFood ? FOOD : undefined
    const foodAttr = isFood ? ({ 'data-food': '' } as Record<string, string>) : undefined
    cells.push(
      <div
        key={i}
        data-cell=""
        data-row={y}
        data-col={x}
        {...foodAttr}
        style={{ background } as CSSProperties}
      />,
    )
  }

  const buttonLabel = phase === 'idle' ? 'Start' : 'Restart'

  return (
    <AppShell
      name="Snake Game"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={`Score ${game.score} · Best ${best}`}
      status={phase === 'playing' ? 'Running' : phase === 'over' ? 'Run ended' : 'Ready'}
      side={
        <Rail title="Snake Game" note="One board · local" chips={['16 × 16', 'Best saved']}>
          <KpiRow>
            <Kpi value={`Score: ${game.score}`} label="this run" accent />
            <Kpi value={`Best: ${best}`} label="on this device" />
          </KpiRow>
          <Keys
            items={[
              ['↑', 'Move up'],
              ['↓', 'Move down'],
              ['←', 'Move left'],
              ['→', 'Move right'],
            ]}
          />
          <Stack>
            {phase === 'idle' && (
              <EmptyState
                mono="Ready"
                title="Press Start"
                detail="Steer with the arrow keys. Each meal grows the snake and adds one to the score."
              />
            )}
            {phase === 'playing' && <Tag accent>Running</Tag>}
            {phase === 'over' && <Tag accent>Run ended</Tag>}
          </Stack>
        </Rail>
      }
    >
      <Card
        mono="Board"
        title="Snake"
        actions={
          <Actions>
            <Button kind="primary" onClick={begin}>
              {buttonLabel}
            </Button>
          </Actions>
        }
      >
        <Board cols={COLS} rows={ROWS} cell={24} label={`Snake board, ${COLS} columns by ${ROWS} rows`}>
          {cells}
        </Board>
        {phase === 'over' && (
          <EmptyState mono="Over" title="Game Over" detail="Press Restart to play again." />
        )}
      </Card>
    </AppShell>
  )
}
