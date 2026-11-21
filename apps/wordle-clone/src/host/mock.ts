// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Persisted state for the Wordle game, kept on this device through the host-mock store.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type GameState = {
  word: string
  guesses: string[]
  current: string
  won: boolean
  lost: boolean
}

export type Stats = {
  wins: number
  bestStreak: number
  currentStreak: number
  gamesPlayed: number
}

export type GameRecord = {
  id: string
  word: string
  guesses: string[]
  won: boolean
  tries: number
  at: number
}

const GAME_KEY = 'lacuna:wordle-clone:game'
const STATS_KEY = 'lacuna:wordle-clone:stats'
const HISTORY_KEY = 'lacuna:wordle-clone:history'

const isGameState = (v: unknown): v is GameState => {
  const g = v as Partial<GameState>
  return (
    typeof g === 'object' &&
    g !== null &&
    typeof g.word === 'string' &&
    Array.isArray(g.guesses) &&
    g.guesses.every((x) => typeof x === 'string') &&
    typeof g.current === 'string' &&
    typeof g.won === 'boolean' &&
    typeof g.lost === 'boolean'
  )
}

const isStats = (v: unknown): v is Stats => {
  const s = v as Partial<Stats>
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof s.wins === 'number' &&
    typeof s.bestStreak === 'number' &&
    typeof s.currentStreak === 'number' &&
    typeof s.gamesPlayed === 'number'
  )
}

const isGameRecord = (v: unknown): v is GameRecord => {
  const r = v as Partial<GameRecord>
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.id === 'string' &&
    typeof r.word === 'string' &&
    Array.isArray(r.guesses) &&
    r.guesses.every((x) => typeof x === 'string') &&
    typeof r.won === 'boolean' &&
    typeof r.tries === 'number' &&
    typeof r.at === 'number'
  )
}

export const gameStore = createMockValue<GameState | null>({
  key: GAME_KEY,
  fallback: null,
  validate: isGameState,
})

export const statsStore = createMockValue<Stats>({
  key: STATS_KEY,
  fallback: { wins: 0, bestStreak: 0, currentStreak: 0, gamesPlayed: 0 },
  validate: isStats,
})

export const historyStore = createMockRecordStore<GameRecord>({
  key: HISTORY_KEY,
  validate: isGameRecord,
  idPrefix: 'g',
})
