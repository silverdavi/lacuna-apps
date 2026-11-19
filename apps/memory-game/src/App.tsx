import { useEffect, useLayoutEffect, useState } from 'react'
import { Button, Card, MonoLabel, Stack } from '@lacuna/ui'
import { loadState, saveState } from './host'
import type { GameState } from './host/mock'
import './app.css'

const GRID = 16
const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// The board is dealt in a fixed order so the game is deterministic: the same
// cards land in the same slots on every load and on every restart. Position 0
// and 15 both carry "A", and position 1 carries "B".
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

  // Persist on every change so a reload restores the score, best, and the
  // cards that are currently face-up or matched.
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

  // When two mismatched cards are locked, turn both back down after 1 second.
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'r' || event.key === 'R') restart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [restart])

  return (
    <main>
      <Card mono="Memory">
        <Stack>
          <h1 className="mg-heading">Card Memory Match</h1>
          <div className="mg-grid" role="group" aria-label="Memory cards">
            {symbols.map((symbol, i) => {
              return (
                <button
                  key={i}
                  type="button"
                  className="mg-card"
                  aria-pressed={isUp(i)}
                  hidden={!isUp(i)}
                  onClick={() => flip(i)}
                >
                  <span className="mg-symbol">{symbol}</span>
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
    </main>
  )
}
