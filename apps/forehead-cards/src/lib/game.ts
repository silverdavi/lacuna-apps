import { mulberry32, shuffle } from '@lacuna/random'
import { DECK, type Card } from '../data/deck'
import type { DeckRecord } from '../host'

/** Split a textarea into one entry per non-empty line, trimmed, without repeats (case-insensitive). */
export function parseEntries(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim().replace(/\s+/g, ' ')
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

export function deckCards(deck: DeckRecord): Card[] {
  const category = deck.category.trim() || deck.name
  return deck.entries.map((text) => ({ text, category }))
}

export function buildPool(categories: string[], includeCustom: boolean, decks: DeckRecord[]): Card[] {
  const chosen = new Set(categories)
  const pool = DECK.filter((c) => chosen.has(c.category))
  if (includeCustom) for (const d of decks) pool.push(...deckCards(d))
  return pool
}

export type Session = { seed: number; seen: Set<string>; signature: string; rounds: number }

export function newSession(): Session {
  return { seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0, seen: new Set(), signature: '', rounds: 0 }
}

/**
 * Deal a round: every card not yet seen this session, in a seeded shuffle. When all cards have
 * been seen the session starts a fresh pass and `restarted` is true.
 */
export function dealRound(session: Session, pool: Card[]): { queue: Card[]; restarted: boolean } {
  const signature = pool.map((c) => c.text).join('|')
  if (signature !== session.signature) {
    session.signature = signature
    session.seen = new Set()
  }
  let restarted = false
  let unseen = pool.filter((c) => !session.seen.has(c.text))
  if (unseen.length === 0 && pool.length > 0) {
    session.seen = new Set()
    unseen = pool
    restarted = true
  }
  session.rounds += 1
  return { queue: shuffle(mulberry32(session.seed + session.rounds * 7919), unseen), restarted }
}

/**
 * Where the screen faces, from the orientation angles: 1 face-up, 0 upright, -1 face-down.
 * It is the vertical part of the screen normal, so it does not depend on portrait or landscape.
 */
export function screenFacing(beta: number, gamma: number): number {
  const rad = Math.PI / 180
  return Math.cos(beta * rad) * Math.cos(gamma * rad)
}

export type TiltCall = 'correct' | 'pass' | null

export const TILT_FIRE = 0.5
export const TILT_NEUTRAL = 0.25

/**
 * A call needs the phone past TILT_FIRE; after one, the phone must come back inside
 * TILT_NEUTRAL before another can fire (neutral-zone hysteresis).
 */
export function classifyTilt(facing: number, armed: boolean): { call: TiltCall; armed: boolean } {
  if (!armed) return { call: null, armed: Math.abs(facing) < TILT_NEUTRAL }
  if (facing <= -TILT_FIRE) return { call: 'correct', armed: false }
  if (facing >= TILT_FIRE) return { call: 'pass', armed: false }
  return { call: null, armed: true }
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

/** Print size class for a card name by length, so long names stay inside the card. */
export function printScale(text: string): 'l' | 'm' | 's' | 'xs' {
  const longest = Math.max(...text.split(' ').map((w) => w.length))
  const n = Math.max(longest, text.length / 2)
  if (n <= 6) return 'l'
  if (n <= 9) return 'm'
  if (n <= 12) return 's'
  return 'xs'
}

export type Result = 'correct' | 'pass'
export type Played = { card: Card; result: Result }
export type RoundRecord = { team: number; played: Played[]; note?: string }
