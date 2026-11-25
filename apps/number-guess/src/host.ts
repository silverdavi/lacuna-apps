// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// Game state for the Number Guess Game: a seedable hidden number, the guess history, and the
// localStorage-backed persistence provided by @lacuna/host-mock.
import { createMockValue } from '@lacuna/host-mock'
import { mulberry32, randomInt } from '@lacuna/random'

export type Guess = {
  id: string
  value: number
  hint: string
}

export type GameSession = {
  seed: string
  target: number
  guesses: Guess[]
  bestScore: number | null
  won: boolean
}

export const MIN_GUESS = 1
export const MAX_GUESS = 100

const KEY = 'lacuna.number-guess.v1'

/** Deterministic 32-bit seed hash: h = h * 31 + charCode, the classic String.hashCode. */
export function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0
  return h >>> 0
}

export function newGame(seed: string): GameSession {
  const name = seed.trim()
  const target = randomInt(mulberry32(hashSeed(name || String(hashSeed('lacuna')))), MIN_GUESS, MAX_GUESS)
  return { seed: name, target, guesses: [], bestScore: null, won: false }
}

export function hintFor(guess: number, target: number): string {
  if (guess === target) return 'Correct'
  return guess < target ? 'Too low' : 'Too high'
}

export function isSession(v: unknown): v is GameSession {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (typeof s.seed !== 'string') return false
  if (!Number.isInteger(s.target) || (s.target as number) < MIN_GUESS || (s.target as number) > MAX_GUESS) return false
  if (!Array.isArray(s.guesses)) return false
  for (const g of s.guesses) {
    if (typeof g !== 'object' || g === null) return false
    const gg = g as Record<string, unknown>
    if (typeof gg.id !== 'string' || !Number.isInteger(gg.value) || typeof gg.hint !== 'string') return false
  }
  if (s.bestScore !== null && s.bestScore !== undefined && !Number.isInteger(s.bestScore)) return false
  if (typeof s.won !== 'boolean') return false
  return true
}

export const gameStore = createMockValue<GameSession | null>({
  key: KEY,
  fallback: null,
  validate: (v): v is GameSession => v === null || isSession(v),
})
