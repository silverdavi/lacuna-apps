// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Persisted state for the Wordle game, kept on this device through the host-mock store.
import { createMockValue } from '@lacuna/host-mock'
import type { GameState, Stats } from './App'

const GAME_KEY = 'lacuna:wordle-clone:game'
const STATS_KEY = 'lacuna:wordle-clone:stats'

export const gameStore = createMockValue<GameState | null>({
  key: GAME_KEY,
  fallback: null,
  validate: (v: unknown): v is GameState => {
    const g = v as Partial<GameState>
    return (
      typeof g === 'object' &&
      g !== null &&
      typeof g.word === 'string' &&
      Array.isArray(g.guesses) &&
      typeof g.current === 'string' &&
      typeof g.won === 'boolean' &&
      typeof g.lost === 'boolean'
    )
  },
})

export const statsStore = createMockValue<Stats>({
  key: STATS_KEY,
  fallback: { wins: 0, bestStreak: 0, currentStreak: 0, gamesPlayed: 0 },
  validate: (v: unknown): v is Stats => {
    const s = v as Partial<Stats>
    return (
      typeof s === 'object' &&
      s !== null &&
      typeof s.wins === 'number' &&
      typeof s.bestStreak === 'number' &&
      typeof s.currentStreak === 'number' &&
      typeof s.gamesPlayed === 'number'
    )
  },
})
