// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// The Wordle game: type a five-letter guess, press Enter, watch the letters light up.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AppShell, Board, Card, Keys, PrimaryButton, Stack } from '@lacuna/ui'
import { WORDS } from './words'
import { gameStore, statsStore } from './host'

const ROWS = 6
const COLS = 5

export type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent'

export interface GameState {
  word: string
  guesses: string[]
  current: string
  won: boolean
  lost: boolean
  invalid: boolean
}

export interface Stats {
  wins: number
  bestStreak: number
  currentStreak: number
  gamesPlayed: number
}

export const DEFAULT_STATS: Stats = { wins: 0, bestStreak: 0, currentStreak: 0, gamesPlayed: 0 }

export function pickWord(gamesPlayed: number): string {
  return WORDS[gamesPlayed % WORDS.length] ?? WORDS[0]!
}

export function freshGame(gamesPlayed: number): GameState {
  return { word: pickWord(gamesPlayed), guesses: [], current: '', won: false, lost: false, invalid: false }
}

export function evaluateGuess(guess: string, word: string): TileState[] {
  const result: TileState[] = Array(COLS).fill('absent')
  const remaining: Record<string, number> = {}
  for (let i = 0; i < COLS; i++) {
    const w = word[i]!
    remaining[w] = (remaining[w] ?? 0) + 1
  }
  for (let i = 0; i < COLS; i++) {
    const g = guess[i]!
    if (g === word[i]) {
      result[i] = 'correct'
      remaining[g] = (remaining[g] ?? 0) - 1
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (result[i] === 'correct') continue
    const g = guess[i]!
    if ((remaining[g] ?? 0) > 0) {
      result[i] = 'present'
      remaining[g] = (remaining[g] ?? 0) - 1
    }
  }
  return result
}

export function statusText(state: GameState): string {
  if (state.won) return `Solved in ${state.guesses.length}`
  if (state.lost) return 'Game Over'
  if (state.invalid) return 'Invalid word'
  if (state.guesses.length === 0 && state.current.length === 0) return 'Ready'
  if (state.guesses.length > 0 && state.current.length === 0) return `Try ${state.guesses.length}`
  return `Try ${state.guesses.length + 1}`
}

export function boardRows(state: GameState): { letter: string; state: TileState }[][] {
  const rows: { letter: string; state: TileState }[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: { letter: string; state: TileState }[] = []
    if (r < state.guesses.length) {
      const guess = state.guesses[r]!
      const evalResult = evaluateGuess(guess, state.word)
      for (let c = 0; c < COLS; c++) {
        row.push({ letter: guess[c]!, state: evalResult[c]! })
      }
    } else if (r === state.guesses.length && state.current.length > 0) {
      for (let c = 0; c < COLS; c++) {
        row.push({
          letter: c < state.current.length ? state.current[c]! : '',
          state: c < state.current.length ? 'filled' : 'empty',
        })
      }
    } else {
      for (let c = 0; c < COLS; c++) {
        row.push({ letter: '', state: 'empty' })
      }
    }
    rows.push(row)
  }
  return rows
}

type KeyHandler = (e: KeyboardEvent) => void
let keyHandler: KeyHandler | null = null
window.addEventListener('keydown', (e) => keyHandler?.(e))

export function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = gameStore.get()
    if (saved && !saved.won && !saved.lost) return { ...saved, invalid: saved.invalid ?? false }
    return freshGame(statsStore.get().gamesPlayed)
  })
  const [stats, setStats] = useState<Stats>(() => statsStore.get())
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (state.won || state.lost) {
      gameStore.clear()
      return
    }
    gameStore.set(state)
  }, [state])

  useEffect(() => {
    statsStore.set(stats)
  }, [stats])

  const appendLetter = (letter: string) => {
    const prev = stateRef.current
    if (prev.won || prev.lost || prev.current.length >= COLS) return
    const next = { ...prev, current: prev.current + letter, invalid: false }
    stateRef.current = next
    setState(next)
  }

  const backspace = () => {
    const prev = stateRef.current
    if (prev.won || prev.lost) return
    const next = { ...prev, current: prev.current.slice(0, -1), invalid: false }
    stateRef.current = next
    setState(next)
  }

  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const submitGuess = () => {
    const prev = stateRef.current
    if (prev.won || prev.lost) return
    const word = prev.current
    if (word.length !== COLS || !WORDS.includes(word)) {
      const next = { ...prev, current: '', invalid: true }
      stateRef.current = next
      setState(next)
      return
    }
    const guesses = [...prev.guesses, word]
    setPendingStatus(`Try ${guesses.length}`)
    const isWin = word === prev.word
    const isLoss = !isWin && guesses.length >= ROWS
    const next: GameState = { word: prev.word, guesses, current: '', won: isWin, lost: isLoss, invalid: false }
    stateRef.current = next
    setState(next)
    setStats((s) => {
      if (isWin) {
        const currentStreak = s.currentStreak + 1
        return {
          ...s,
          wins: s.wins + 1,
          currentStreak,
          bestStreak: Math.max(s.bestStreak, currentStreak),
          gamesPlayed: s.gamesPlayed + 1,
        }
      }
      if (isLoss) {
        return { ...s, currentStreak: 0, gamesPlayed: s.gamesPlayed + 1 }
      }
      return s
    })
    setTimeout(() => setPendingStatus(null), 500)
  }

  keyHandler = (e: KeyboardEvent) => {
    const key = e.key
    if (key === 'Enter') {
      e.preventDefault()
      submitGuess()
    } else if (key === 'Backspace') {
      e.preventDefault()
      backspace()
    } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
      appendLetter(key)
    }
  }

  const newGame = () => {
    const next = freshGame(statsStore.get().gamesPlayed)
    stateRef.current = next
    setState(next)
  }

  const rows = boardRows(state)
  const status = pendingStatus ?? statusText(state)

  return (
    <AppShell
      name="Wordle Game"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={`Wins ${stats.wins} · Streak ${stats.bestStreak}`}
      status={status}
    >
      <Card mono="Board" title="Wordle Game">
        <Stack>
          <p className="lc-body-sm">Guess the word in 6 tries</p>
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))' }}>
            <span data-wins={stats.wins}>Wins: {stats.wins}</span>
            <span data-streak={stats.bestStreak}>Best Streak: {stats.bestStreak}</span>
          </div>
          <Board cols={COLS} rows={ROWS} cell={48} label="Wordle board">
            {rows.map((row, r) => (
              <div key={r} data-row={r} style={{ display: 'contents' }}>
                {row.map((cell, c) => (
                  <div
                    key={c}
                    data-letter={cell.letter}
                    data-state={cell.state}
                    style={tileStyle(cell.state)}
                  >
                    {cell.letter}
                  </div>
                ))}
              </div>
            ))}
          </Board>
        </Stack>
      </Card>
      <Card mono="Controls" title="Actions">
        <Stack>
          <PrimaryButton onClick={newGame}>New Game</PrimaryButton>
          <Keys
            items={[
              ['A–Z', 'type a letter'],
              ['Backspace', 'delete a letter'],
              ['Enter', 'submit the guess'],
            ]}
          />
        </Stack>
      </Card>
    </AppShell>
  )
}

function tileStyle(state: TileState): CSSProperties | undefined {
  switch (state) {
    case 'correct':
      return { background: 'var(--accent)', color: 'var(--paper)' }
    case 'present':
      return { background: 'var(--paper-deep)', color: 'var(--ink)' }
    case 'absent':
      return { background: 'var(--paper-deep)', color: 'var(--ink-60)' }
    case 'filled':
      return { background: 'var(--ui-card)', color: 'var(--ink)' }
    default:
      return undefined
  }
}
