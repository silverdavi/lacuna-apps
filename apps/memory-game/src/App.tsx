import { useEffect, useLayoutEffect, useState } from 'react'
import { AppShell, Button, Card, MonoLabel, Stack } from '@lacuna/ui'
import { useHotkeys } from '@lacuna/use-hotkeys'
import { loadState, saveState } from './host'
import type { GameState } from './host/mock'

const GRID = 16
const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const BOARD: string[] = [
  'A', 'B', 'C', 'D',
  'E', 'F', 'G', 'H',
  'H', 'G', 'F', 'E',
  'D', 'C', 'B', 'A',
]

function deal(): string[] {
  return BOARD.slice()
}

function initial(): GameState {
  const saved = loadState()
  if (saved.symbols.length === GRID) {
    return {
      symbols: saved.symbols.slice(0, GRID),
      faceUp: saved.faceUp.filter((i) => i < GRID),
      locked: saved.locked.filter((i) => i < GRID),
      score: saved.score,
      best: saved.best,
    }
  }
  return { symbols: deal(), faceUp: [], locked: [], score: 0, best: saved.best }
}

export function App() {
  const [state, setState] = useState<GameState>(initial)
  const { symbols, faceUp, locked, score, best } = state

  useLayoutEffect(() => {
    saveState(state)
  }, [state])

  const flip = (index: number) => {
    setState((prev) => {
      if (prev.faceUp.includes(index)) return prev
      if (prev.locked.length >= 2) return prev
      const nextFaceUp = [...prev.faceUp, index]
      if (nextFaceUp.length < 2) {
        return { ...prev, faceUp: nextFaceUp }
      }
      const [first, second] = nextFaceUp
      if (prev.symbols[first] === prev.symbols[second]) {
        const nextScore = prev.score + 1
        const nextBest = Math.max(prev.best, nextScore)
        return { ...prev, faceUp: [], locked: [...prev.locked, first, second], score: nextScore, best: nextBest }
      }
      return { ...prev, faceUp: nextFaceUp, locked: nextFaceUp }
    })
  }

  const isUp = (i: number) => faceUp.includes(i) || locked.includes(i)

  useEffect(() => {
    if (locked.length !== 2) return
    const id = window.setTimeout(() => {
      setState((prev) =>
        prev.locked.length === 2 ? { ...prev, faceUp: [], locked: [] } : prev,
      )
    }, 1000)
    return () => window.clearTimeout(id)
  }, [locked])

  const restart = () => {
    setState((prev) => ({ symbols: deal(), faceUp: [], locked: [], score: 0, best: prev.best }))
  }

  useHotkeys([
    {
      keys: 'r',
      handler: () => restart(),
    },
  ])

  return (
    <AppShell name="Card Memory Match" icon="grid" hue="cobalt" category="Games">
      <Card mono="Memory">
        <Stack>
          <div className="mg-grid" role="group" aria-label="Memory cards">
            {symbols.map((symbol, i) => {
              const up = isUp(i)
              return (
                <button
                  key={i}
                  type="button"
                  className={`mg-card${up ? ' mg-card-up' : ''}`}
                  aria-label={`Card ${i + 1}`}
                  onClick={() => flip(i)}
                >
                  {up ? symbol : '?'}
                </button>
              )
            })}
          </div>
          <div className="mg-score">
            <span className="mg-score-item">{`Score: ${score}`}</span>
            <span className="mg-score-item">{`Best: ${best}`}</span>
          </div>
          <Button kind="primary" onClick={restart}>
            Restart
          </Button>
          <div className="mg-hint">
            <MonoLabel sm>How to play</MonoLabel>
            <p>Flip two cards to find a matching symbol. A match stays up and scores one point; a miss turns back down. Press the key r to restart.</p>
          </div>
        </Stack>
      </Card>
    </AppShell>
  )
}
