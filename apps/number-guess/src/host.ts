import { useCallback, useEffect, useRef, useState } from 'react'
import { createMockValue } from '@lacuna/host-mock'

export const MAX_ATTEMPTS = 7

export type GuessRow = {
  value: number
  hint: 'Too low' | 'Too high' | 'Correct'
}

export type PersistedGame = {
  seed: string
  target: number
  rows: GuessRow[]
  phase: 'playing' | 'won' | 'lost'
  attempts: number
}

export type Phase = 'idle' | 'playing' | 'won' | 'lost'

const GAME_KEY = 'number-guess.game'
const BEST_KEY = 'number-guess.best'

function isRow(v: unknown): v is GuessRow {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.value === 'number' &&
    typeof r.hint === 'string' &&
    (r.hint === 'Too low' || r.hint === 'Too high' || r.hint === 'Correct')
  )
}

function isGame(v: unknown): v is PersistedGame {
  if (typeof v !== 'object' || v === null) return false
  const g = v as Record<string, unknown>
  return (
    typeof g.seed === 'string' &&
    typeof g.target === 'number' &&
    Array.isArray(g.rows) &&
    g.rows.every(isRow) &&
    typeof g.phase === 'string' &&
    (g.phase === 'playing' || g.phase === 'won' || g.phase === 'lost') &&
    typeof g.attempts === 'number'
  )
}

const gameStore = createMockValue<PersistedGame | null>({
  key: GAME_KEY,
  fallback: null,
  validate: (v): v is PersistedGame | null => v === null || isGame(v),
})

const bestStore = createMockValue<number | null>({
  key: BEST_KEY,
  fallback: null,
  validate: (v): v is number | null => v === null || typeof v === 'number',
})

export function targetFor(seed: string): number {
  const s = Number.parseInt(seed, 10) || 0
  return ((s * 43 + 10) % 100) + 1
}

export function useGame() {
  const [seed, setSeedState] = useState<string>('42')
  const [game, setGame] = useState<PersistedGame | null>(() =>
    gameStore.get(),
  )
  const [best, setBest] = useState<number | null>(() => bestStore.get())
  const [guess, setGuess] = useState('')
  const [toast, setToastState] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [lastWin, setLastWin] = useState<PersistedGame | null>(null)

  const setSeed = useCallback((s: string) => setSeedState(s), [])

  const showToast = useCallback((msg: string) => {
    setToastState(msg)
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastState(null), 2400)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const phase: Phase = game === null ? 'idle' : game.phase
  const target = game?.target ?? null
  const rows = game?.rows ?? []
  const attempts = game?.attempts ?? 0

  const newGame = useCallback(() => {
    const t = targetFor(seed)
    const g: PersistedGame = {
      seed,
      target: t,
      rows: [],
      phase: 'playing',
      attempts: 0,
    }
    setGame(g)
    gameStore.set(g)
    setGuess('')
    setLastWin(null)
    showToast('New game started')
  }, [seed, showToast])

  const submit = useCallback(() => {
    if (game === null || game.phase !== 'playing') return
    const trimmed = guess.trim()
    const n = Number(trimmed)
    if (trimmed === '' || !Number.isInteger(n) || n < 1 || n > 100) {
      showToast('Enter a valid number between 1 and 100')
      return
    }
    const next: GuessRow =
      n < game.target
        ? { value: n, hint: 'Too low' }
        : n > game.target
          ? { value: n, hint: 'Too high' }
          : { value: n, hint: 'Correct' }
    const nextRows = [...game.rows, next]
    const nextAttempts = game.attempts + 1
    let nextPhase: 'playing' | 'won' | 'lost' = 'playing'
    if (next.hint === 'Correct') nextPhase = 'won'
    else if (nextAttempts >= MAX_ATTEMPTS) nextPhase = 'lost'
    const g: PersistedGame = {
      ...game,
      rows: nextRows,
      attempts: nextAttempts,
      phase: nextPhase,
    }
    setGame(g)
    gameStore.set(g)
    setGuess('')

    if (nextPhase === 'won') {
      const prev = bestStore.get()
      if (prev === null || nextAttempts < prev) {
        setBest(nextAttempts)
        bestStore.set(nextAttempts)
      }
      setLastWin({ ...g })
      showToast(`Correct! You won in ${nextAttempts} attempts.`)
    } else if (nextPhase === 'lost') {
      showToast('Out of attempts. The number was ' + game.target)
    } else {
      showToast(next.hint === 'Too low' ? 'Try a higher number' : 'Try a lower number')
    }
  }, [game, guess, showToast])

  return {
    seed,
    setSeed,
    target,
    targetSet: game !== null,
    guess,
    setGuess,
    rows,
    phase,
    toast,
    best,
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    newGame,
    submit,
    lastWin,
  }
}
