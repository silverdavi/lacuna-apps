import { useEffect, useLayoutEffect, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  Rail,
  SectionLabel,
  Tag,
} from '@lacuna/ui'
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

const SYMBOL_COLOR: Record<string, string> = {
  A: 'var(--geo-cobalt)',
  B: 'var(--geo-verm)',
  C: 'var(--geo-gold)',
  D: 'var(--geo-green)',
  E: 'var(--geo-comm)',
  F: 'var(--geo-teal)',
  G: 'var(--geo-legal)',
  H: 'var(--ink)',
}

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

type Phase = 'idle' | 'playing' | 'won'

function phaseFrom(state: GameState): Phase {
  return state.locked.length === GRID ? 'won' : 'idle'
}

export function App() {
  const [state, setState] = useState<GameState>(initial)
  const [phase, setPhase] = useState<Phase>(() => phaseFrom(initial()))
  const [mismatched, setMismatched] = useState<number[]>([])
  const { symbols, faceUp, locked, score, best } = state

  useLayoutEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (locked.length === GRID) {
      setPhase('won')
    }
  }, [locked.length])

  const flip = (index: number) => {
    if (phase === 'won') return
    setState((prev) => {
      if (prev.faceUp.includes(index)) return prev
      if (prev.locked.length >= 2) return prev
      if (prev.faceUp.length + prev.locked.length >= GRID) return prev
      const nextFaceUp = [...prev.faceUp, index]
      if (nextFaceUp.length < 2) {
        setPhase('playing')
        return { ...prev, faceUp: nextFaceUp }
      }
      const [first, second] = nextFaceUp
      if (prev.symbols[first] === prev.symbols[second]) {
        const nextScore = prev.score + 1
        const nextBest = Math.max(prev.best, nextScore)
        const newLocked = [...prev.locked, first, second]
        if (newLocked.length === GRID) setPhase('won')
        return { ...prev, faceUp: [], locked: newLocked, score: nextScore, best: nextBest }
      }
      setMismatched(nextFaceUp)
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
      setMismatched([])
    }, 1000)
    return () => window.clearTimeout(id)
  }, [locked])

  const restart = () => {
    setState((prev) => ({ symbols: deal(), faceUp: [], locked: [], score: 0, best: prev.best }))
    setPhase('idle')
    setMismatched([])
  }

  useHotkeys([
    {
      keys: 'r',
      handler: () => restart(),
      description: 'Restart',
    },
  ])

  const statusText =
    phase === 'won'
      ? 'Cleared · best ' + best
      : phase === 'playing'
        ? 'In play · ' + score + ' / 8 pairs'
        : 'Ready'

  return (
    <AppShell
      name="Card Memory Match"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={statusText}
      status={phase === 'won' ? 'Local · no network · cleared' : 'Local · no network'}
      side={
        <Rail
          title="Score"
          note={phase === 'won' ? 'All 8 pairs matched' : score + ' of 8 pairs'}
          chips={phase === 'won' ? ['cleared'] : ['active']}
        >
          <div className="mg-score">
            <span className="mg-score-item">{'Score: ' + score}</span>
            <span className="mg-score-item">{'Best: ' + best}</span>
          </div>
        </Rail>
      }
    >
      <Card
        title="Board"
        mono="4 × 4 · 8 pairs"
        actions={
          <Button kind="primary" onClick={restart}>
            Restart
          </Button>
        }
      >
        {phase === 'won' ? (
          <EmptyState
            mono="Cleared"
            title="All pairs matched"
            detail={`Score ${score} · Best ${best}. Press Restart or r to play again.`}
          >
            <Button kind="primary" onClick={restart}>
              Play again
            </Button>
          </EmptyState>
        ) : (
          <div className="mg-grid" role="group" aria-label="Memory cards">
            {symbols.map((symbol, i) => {
              const up = isUp(i)
              const isMismatch = mismatched.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  className={`mg-card${up ? ' mg-card-up' : ''}${isMismatch ? ' mg-card-mismatch' : ''}`}
                  aria-label={`Card ${i + 1}`}
                  onClick={() => flip(i)}
                  style={
                    up
                      ? { background: SYMBOL_COLOR[symbol] ?? 'var(--ink)', color: 'var(--paper)' }
                      : undefined
                  }
                >
                  {up ? symbol : '?'}
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="How to play" mono="Rules">
        <SectionLabel>Goal</SectionLabel>
        <p className="mg-rule-text">
          Flip two cards to find a matching symbol. A match stays face up and scores one
          point; a miss turns back down. Find all 8 pairs to clear the board.
        </p>
        <SectionLabel>Controls</SectionLabel>
        <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
          <Tag>Click or tap a card to flip</Tag>
          <Tag>Arrow keys to move, Enter to flip</Tag>
          <Tag>r to restart</Tag>
        </div>
      </Card>
    </AppShell>
  )
}
