import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  Keys,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Tag,
} from '@lacuna/ui'
import { ALIVE } from './colors'
import { CELLS, COLS, ROWS, countAlive, emptyBoard, step, toggleAt, type Cells } from './engine'
import { host } from './host'

const TICK_MS = 25

type Phase = 'paused' | 'running'

// One keydown listener, attached once at module scope, that calls the handler the
// component sets on every render. Attaching inside useEffect misses a key pressed
// the instant the page has loaded.
type Shortcut = (e: KeyboardEvent) => void
let shortcutRef: Shortcut | null = null
window.addEventListener('keydown', (e) => shortcutRef?.(e))

export function App() {
  const [cells, setCells] = useState<Cells>(() => {
    const saved = host.readBoard()
    if (saved && saved.cols === COLS && saved.rows === ROWS) return saved.cells
    return emptyBoard()
  })
  const [phase, setPhase] = useState<Phase>('paused')
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    host.writeBoard({ cols: COLS, rows: ROWS, cells })
  }, [cells])

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      setCells((prev) => step(prev))
      setGeneration((g) => g + 1)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [phase])

  const doStep = () => {
    setCells((prev) => step(prev))
    setGeneration((g) => g + 1)
  }

  shortcutRef = (e: KeyboardEvent) => {
    if (e.repeat) return
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    if (e.key === ' ') {
      e.preventDefault()
      setPhase((p) => (p === 'running' ? 'paused' : 'running'))
    } else if (e.key === 's' || e.key === 'S') {
      doStep()
    } else if (e.key === 'c' || e.key === 'C') {
      setCells(emptyBoard())
      setGeneration(0)
    }
  }

  const population = countAlive(cells)

  return (
    <AppShell
      name="Conway Game of Life"
      icon="grid"
      hue="rust"
      category="Games"
      meta={`Population: ${population}`}
      status={phase === 'running' ? 'Running' : 'Paused'}
      side={
        <Rail note="Conway's world" chips={[`${COLS} × ${ROWS}`, 'State kept', 'Live cells']}>
          <KpiRow>
            <Kpi value={`Pop: ${population}`} label="alive now" accent />
            <Kpi value={`Gen: ${generation}`} label="steps taken" />
          </KpiRow>
          <Stack>
            {phase === 'running' ? <Tag accent>Running</Tag> : <Tag>Paused</Tag>}
          </Stack>
          <Keys
            items={[
              ['Space', 'Run / stop'],
              ['S', 'Step once'],
              ['C', 'Clear board'],
            ]}
          />
        </Rail>
      }
    >
      <Card
        mono="Board"
        actions={
          <Actions>
            <Button kind="primary" onClick={doStep}>
              Step
            </Button>
            <Button
              kind={phase === 'running' ? 'secondary' : 'primary'}
              onClick={() => setPhase((p) => (p === 'running' ? 'paused' : 'running'))}
            >
              {phase === 'running' ? 'Stop' : 'Run'}
            </Button>
            <Button
              onClick={() => {
                setCells(emptyBoard())
                setGeneration(0)
              }}
            >
              Clear
            </Button>
          </Actions>
        }
      >
        <Board cols={COLS} rows={ROWS} cell={40} label={`Game of Life board, ${COLS} columns by ${ROWS} rows`}>
          {Array.from({ length: CELLS }, (_, i) => {
            const y = Math.floor(i / COLS)
            const x = i % COLS
            return (
              <button
                key={i}
                type="button"
                aria-label={`Cell row ${y + 1}, column ${x + 1}`}
                aria-pressed={cells[i] ? true : false}
                onClick={() => setCells((prev) => toggleAt(prev, i))}
                style={{ background: cells[i] ? ALIVE : undefined } as CSSProperties}
              />
            )
          })}
        </Board>
      </Card>
    </AppShell>
  )
}
