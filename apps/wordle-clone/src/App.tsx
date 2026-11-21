// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// The Wordle game: type a five-letter guess, press Enter, watch the letters light up.
import { useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Board,
  Button,
  Card,
  Keys,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Stack,
  Tag,
} from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { useLocalRecord } from '@lacuna/use-local-record'
import { gameStore, statsStore, historyStore } from './host'
import type { GameState, Stats, GameRecord } from './host'
import { WORDS } from './words'
import './styles.css'

const ROWS = 6
const COLS = 5
const HELP_KEY = 'lacuna:wordle-clone:help'

type KeyHandler = (e: KeyboardEvent) => void
let keyHandler: KeyHandler | null = null
window.addEventListener('keydown', (e) => keyHandler?.(e))

export type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent'

export function pickWord(gamesPlayed: number): string {
  return WORDS[gamesPlayed % WORDS.length] ?? WORDS[0]!
}

export function freshGame(gamesPlayed: number): GameState {
  return { word: pickWord(gamesPlayed), guesses: [], current: '', won: false, lost: false }
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

function statusText(state: GameState, pending: string | null): { text: string; kind: 'ok' | 'bad' | 'idle' } {
  if (pending) return { text: pending, kind: 'ok' }
  if (state.won) return { text: `Solved in ${state.guesses.length}`, kind: 'ok' }
  if (state.lost) return { text: 'Game Over', kind: 'bad' }
  if (state.current.length > 0) return { text: `Try ${state.guesses.length + 1}`, kind: 'idle' }
  if (state.guesses.length > 0) return { text: `Try ${state.guesses.length}`, kind: 'idle' }
  return { text: 'Ready', kind: 'idle' }
}



const KEY_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
]

function keyClass(letter: string, best: Record<string, TileState>): string {
  const cls = 'wc-key'
  if (letter === 'ENTER' || letter === 'DEL') return cls + ' wc-key--wide'
  const state = best[letter]
  if (state === 'correct') return cls + ' wc-key--correct'
  if (state === 'present') return cls + ' wc-key--present'
  if (state === 'absent') return cls + ' wc-key--absent'
  return cls
}

export function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = gameStore.get()
    if (saved && !saved.won && !saved.lost) return saved
    return freshGame(statsStore.get().gamesPlayed)
  })
  const [stats, setStats] = useState<Stats>(() => statsStore.get())
  const [history, setHistory] = useState<GameRecord[]>(() => historyStore.list().slice(0, 5))
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [shake, setShake] = useState(0)
  const tips = useLocalRecord<boolean>({ key: HELP_KEY, version: 1, defaultValue: true })

  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (state.won || state.lost) {
      gameStore.clear()
      historyStore.add({
        word: state.word,
        guesses: state.guesses,
        won: state.won,
        tries: state.guesses.length,
        at: Date.now(),
      })
      setHistory(historyStore.list().slice(0, 5))
    } else {
      gameStore.set(state)
    }
  }, [state])

  useEffect(() => {
    statsStore.set(stats)
  }, [stats])

  const appendLetter = (letter: string) => {
    const prev = stateRef.current
    if (prev.won || prev.lost || prev.current.length >= COLS) return
    const next = { ...prev, current: prev.current + letter }
    stateRef.current = next
    setState(next)
  }

  const backspace = () => {
    const prev = stateRef.current
    if (prev.won || prev.lost) return
    const next = { ...prev, current: prev.current.slice(0, -1) }
    stateRef.current = next
    setState(next)
  }

  const submitGuess = () => {
    const prev = stateRef.current
    if (prev.won || prev.lost) return
    const word = prev.current
    if (word.length !== COLS || !WORDS.includes(word)) {
      setShake((n) => n + 1)
      setPendingStatus('Invalid word')
      setTimeout(() => setPendingStatus(null), 900)
      return
    }
    const guesses = [...prev.guesses, word]
    const isWin = word === prev.word
    const isLoss = !isWin && guesses.length >= ROWS
    const next: GameState = { word: prev.word, guesses, current: '', won: isWin, lost: isLoss }
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
  }

  keyHandler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
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
    const next = freshGame(stats.gamesPlayed)
    stateRef.current = next
    setState(next)
  }

  const rows = boardRows(state)
  const status = statusText(state, pendingStatus)
  const keyState = keyStates(state)

  return (
    <AppShell
      name="Wordle Game"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={`Wins ${stats.wins} · Streak ${stats.bestStreak}`}
    >
      <Card mono="Board" title="Wordle Game">
        <Stack>
          <p className="lc-body-sm">Guess the word in 6 tries</p>
          <div className="wc-status" data-kind={status.kind} role="status">
            {status.text}
          </div>
          {tips.value && !state.won && !state.lost ? (
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              <Tag>New game</Tag>
              <Tag accent>5-letter word</Tag>
              <Tag>6 tries</Tag>
            </div>
          ) : null}
          <div className="wc-board-row" role="presentation">
            <div className="wc-row-labels" aria-hidden="true">
              {rows.map((_, r) => (
                <span key={r} className="wc-row-label">Try {r + 1}</span>
              ))}
            </div>
            <Board cols={COLS} rows={ROWS} cell={48} label="Wordle board">
              {rows.map((row, r) => (
                <div key={r} data-row={r} style={{ display: 'contents' }}>
                  {row.map((cell, c) => (
                    <div key={c} data-letter={cell.letter} data-state={cell.state}>
                      {cell.letter}
                    </div>
                  ))}
                </div>
              ))}
            </Board>
          </div>
          <div className="wc-keys" aria-label="On-screen keyboard">
            {KEY_ROWS.map((row, r) => (
              <div key={r} style={{ display: 'contents' }}>
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    className={keyClass(letter, keyState)}
                    disabled={state.won || state.lost}
                    onClick={() => {
                      if (letter === 'ENTER') submitGuess()
                      else if (letter === 'DEL') backspace()
                      else appendLetter(letter)
                    }}
                  >
                    {letter === 'ENTER' ? 'Enter' : letter === 'DEL' ? '⌫' : letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'calc(12px * var(--sf))', flexWrap: 'wrap', alignItems: 'center' }}>
            <PrimaryButton onClick={newGame}>New Game</PrimaryButton>
            <Button onClick={() => setHelpOpen(true)}>How to Play</Button>
            {tips.value ? (
              <Button onClick={() => tips.set(false)}>Hide tips</Button>
            ) : (
              <Button onClick={() => tips.set(true)}>Show tips</Button>
            )}
          </div>
        </Stack>
      </Card>
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="How to Play">
        <Stack lg>
          <p className="lc-body-sm">
            Guess the hidden five-letter word in six tries. Each guess is a real five-letter word.
            After each guess, the tiles light up to show how close you were:
          </p>
          <Keys
            items={[
              ['green', 'the letter is in the word and in the right spot'],
              ['gold', 'the letter is in the word but in a different spot'],
              ['dim', 'the letter is not in the word'],
              ['A–Z', 'type a letter'],
              ['Backspace', 'delete a letter'],
              ['Enter', 'submit the guess'],
            ]}
          />
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        </Stack>
      </Dialog>
      <Card mono="Last 5" title="History">
        <Stack>
          {history.length === 0 ? (
            <p className="lc-body-sm" style={{ color: 'var(--ink-60)' }}>
              No games finished yet.
            </p>
          ) : (
            history.map((g) => (
              <div key={g.id} className="wc-hist-meta">
                <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))' }}>
                  {g.word}
                </span>
                <div className="wc-history" aria-label={`Guesses for ${g.word}`}>
                  {Array.from({ length: g.tries }, (_, r) => (
                    <span
                      key={r}
                      className="wc-history-cell"
                      data-state={g.won ? 'correct' : 'absent'}
                    >
                      {r < g.tries ? g.won ? '✓' : '✗' : ''}
                    </span>
                  ))}
                </div>
                <Tag accent={g.won}>{g.won ? 'Won' : 'Missed'}</Tag>
              </div>
            ))
          )}
        </Stack>
      </Card>
      <Rail
        title="Stats"
        note={`${stats.gamesPlayed} played`}
        chips={[`Best ${stats.bestStreak}`, `Streak ${stats.currentStreak}`]}
      >
        <KpiRow>
          <Kpi value={stats.wins} label="Wins" accent />
          <Kpi value={stats.bestStreak} label="Best Streak" />
          <Kpi value={stats.currentStreak} label="Streak" />
        </KpiRow>
        <p style={{ marginTop: 'calc(10px * var(--sf))', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>
          Wins: {stats.wins}
        </p>
        <p style={{ fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>
          Best Streak: {stats.bestStreak}
        </p>
      </Rail>
    </AppShell>
  )
}

function boardRows(state: GameState): { letter: string; state: TileState }[][] {
  const rows: { letter: string; state: TileState }[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: { letter: string; state: TileState }[] = []
    if (r < state.guesses.length) {
      const guess = state.guesses[r]!
      const evalResult = evaluateGuess(guess, state.word)
      for (let c = 0; c < COLS; c++) {
        row.push({ letter: guess[c]!, state: evalResult[c]! })
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

function keyStates(state: GameState): Record<string, TileState> {
  const best: Record<string, TileState> = {}
  const rank: Record<TileState, number> = { empty: 0, filled: 0, absent: 1, present: 2, correct: 3 }
  for (const guess of state.guesses) {
    const evalResult = evaluateGuess(guess, state.word)
    for (let i = 0; i < COLS; i++) {
      const letter = guess[i]!
      const s = evalResult[i]!
      if (!best[letter] || rank[s] > rank[best[letter]!]) {
        best[letter] = s
      }
    }
  }
  return best
}
