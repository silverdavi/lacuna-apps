import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { Chart } from '@lacuna/chart'
import { cryptoRng } from '@lacuna/random'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
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
  Row,
  SectionLabel,
  Select,
  Stack,
  Tag,
} from '@lacuna/ui'
import { FOOD, SNAKE } from './colors'
import { host } from './host'
import { COLS, ROWS, createGame, queueDirection, stepGame, type Game, type Vec } from './engine'

type Phase = 'idle' | 'playing' | 'over'

interface RunEntry {
  id: string
  score: number
  length: number
  seconds: number
  speed: string
}

interface RunsRecord {
  best: number
  runs: RunEntry[]
}

const RUNS_KEY = 'lacuna.snake-game.runs.v1'

const SPEEDS = [
  { value: 'slow', label: 'Relaxed · 90 ms' },
  { value: 'normal', label: 'Classic · 60 ms' },
  { value: 'fast', label: 'Frenzy · 40 ms' },
]
const TICK_BY_SPEED: Record<string, number> = { slow: 90, normal: 60, fast: 40 }
const SPEED_OF_TICK: Record<number, string> = { 90: 'Relaxed', 60: 'Classic', 40: 'Frenzy' }

type Steer = (e: KeyboardEvent) => void

// One keydown listener, attached once at module scope, that calls the handler the
// component sets on every render. Attaching inside useEffect misses a key pressed
// the instant the page has loaded; the tests press keys immediately.
let steerRef: Steer | null = null
window.addEventListener('keydown', (e) => steerRef?.(e))

function makeRunId(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return `run-${Date.now().toString(36)}-${bytes[0].toString(36)}`
}

export function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [game, setGame] = useState<Game>(() => createGame())
  const [speed, setSpeed] = useState('normal')
  const [tab, setTab] = useState<'Runs' | 'Stats'>('Runs')
  const { value: runs, set: setRuns } = useLocalRecord<RunsRecord>({
    key: RUNS_KEY,
    version: 1,
    defaultValue: { best: 0, runs: [] },
  })
  const [best, setBest] = useState<number>(() => Math.max(host.loadGame().best, 0))
  const { copied, copy } = useClipboard()
  const bestRef = useRef(best)
  const rngRef = useRef(cryptoRng())
  const startedAtRef = useRef<number | null>(null)
  const endedRef = useRef(false)

  const tickMs = TICK_BY_SPEED[speed] ?? 60

  const endRun = (g: Game) => {
    const seconds = startedAtRef.current ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)) : 0
    const entry: RunEntry = {
      id: makeRunId(),
      score: g.score,
      length: g.snake.length,
      seconds,
      speed: SPEED_OF_TICK[tickMs] ?? 'Classic',
    }
    setRuns((prev) => ({
      best: Math.max(prev.best, g.score),
      runs: [entry, ...prev.runs].slice(0, 12),
    }))
  }

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
    endedRef.current = false
    const id = window.setInterval(() => {
      setGame((prev) => {
        const { game: next, dead } = stepGame(prev, rngRef.current())
        if (next.score > bestRef.current) {
          bestRef.current = next.score
          setBest(next.score)
          host.saveBest(next.score)
        }
        if (dead) {
          setPhase('over')
          if (!endedRef.current) {
            endedRef.current = true
            endRun(next)
          }
        }
        return next
      })
    }, tickMs)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tickMs])

  const begin = () => {
    setGame(createGame())
    startedAtRef.current = Date.now()
    setPhase('playing')
  }

  const removeRun = (id: string) => {
    setRuns((prev) => ({ ...prev, runs: prev.runs.filter((r) => r.id !== id) }))
  }

  const copySummary = () => {
    const line = `Snake Game · best ${best} · ${runs.runs.length} runs on this device`
    copy(line).catch(() => undefined)
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

  const chartData = runs.runs.slice(0, 8).map((r, i) => ({
    label: `Run ${runs.runs.length - i}`,
    value: r.score,
  }))

  const recent = runs.runs.slice(0, 8)
  const total = recent.reduce((s, r) => s + r.score, 0)
  const avg = recent.length ? Math.round((total / recent.length) * 10) / 10 : 0

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
        <Rail title="Snake Game" note="One board · local" chips={['16 × 16', 'Best saved', 'Runs kept']}>
          <KpiRow>
            <Kpi value={`Score: ${game.score}`} label="this run" accent />
            <Kpi value={`Best: ${best}`} label="on this device" />
          </KpiRow>
          <Select
            label="Speed"
            value={speed}
            onChange={setSpeed}
            options={SPEEDS}
          />
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

      <Card
        mono="History"
        title="Runs"
        actions={
          <Actions>
            <Button onClick={copySummary} disabled={!runs.runs.length && best === 0}>
              {copied ? 'Copied' : 'Copy summary'}
            </Button>
            <Button
              kind="primary"
              onClick={() => setRuns({ best: 0, runs: [] })}
              disabled={runs.runs.length === 0}
            >
              Clear
            </Button>
          </Actions>
        }
      >
        <Stack>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <Button kind={tab === 'Runs' ? 'primary' : 'secondary'} onClick={() => setTab('Runs')}>
              Runs
            </Button>
            <Button kind={tab === 'Stats' ? 'primary' : 'secondary'} onClick={() => setTab('Stats')}>
              Stats
            </Button>
          </div>
          {tab === 'Runs' &&
            (runs.runs.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No runs yet"
                detail="Finish a game and the run lands here, kept on this device."
              />
            ) : (
              <ul className="lk-list" aria-label="Finished runs">
                {runs.runs.map((r) => (
                  <Row
                    key={r.id}
                    title={`Run · ${r.speed}`}
                    meta={`${r.length} long · ${r.seconds}s`}
                    value={r.score}
                    action={
                      <Button ariaLabel={`Remove run scored ${r.score}`} onClick={() => removeRun(r.id)}>
                        Remove
                      </Button>
                    }
                  />
                ))}
              </ul>
            ))}
          {tab === 'Stats' && (
            <Stack lg>
              <KpiRow>
                <Kpi value={recent.length} label="runs kept" />
                <Kpi value={avg} label="average score" accent />
                <Kpi value={runs.runs[0]?.length ?? 0} label="last length" />
              </KpiRow>
              <Chart
                type="bar"
                data={chartData}
                title="Scores, recent runs"
                ariaLabel="Bar chart of scores across recent runs"
              />
            </Stack>
          )}
        </Stack>
      </Card>
    </AppShell>
  )
}
