// Pure deck engine: no React, no storage, no clock. Unit-testable.
import { mulberry32, randomInt, shuffle, type Rng } from '@lacuna/random'

export interface Question {
  id: number
  /** Category index into Bank.categories. */
  c: number
  /** Tier 1 to 3. */
  t: 1 | 2 | 3
  q: string
  a: string
  /** Fun fact; may be empty. */
  n: string
  /** Themed round title, or null. */
  r: string | null
}

export interface Bank {
  categories: string[]
  rows: Question[]
}

export type Tier = 1 | 2 | 3
export const TIER_NAMES: Record<Tier, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }
export const SEEN_CAP = 500
export const DECK_SIZES = [10, 20, 50, 0] as const // 0 means all

export function filterBank(bank: Bank, cats: readonly number[], tiers: readonly number[]): Question[] {
  const c = new Set(cats)
  const t = new Set(tiers)
  return bank.rows.filter((row) => c.has(row.c) && t.has(row.t))
}

/** A 32-bit seed from any string, for example a YYYY-MM-DD key. */
export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Build a shuffled deck from the matching pool. Questions seen in the last SEEN_CAP cards are
 * left out while enough fresh ones remain; otherwise the least recently seen fill the gap.
 * size 0 means every matching question.
 */
export function buildDeck(pool: readonly Question[], size: number, recent: readonly number[], rng: Rng): Question[] {
  const want = size <= 0 ? pool.length : Math.min(size, pool.length)
  const lastSeen = new Map<number, number>()
  recent.slice(-SEEN_CAP).forEach((id, i) => lastSeen.set(id, i))
  const fresh = pool.filter((row) => !lastSeen.has(row.id))
  const stale = pool.filter((row) => lastSeen.has(row.id)).sort((x, y) => lastSeen.get(x.id)! - lastSeen.get(y.id)!)
  const picked = shuffle(rng, fresh).slice(0, want)
  if (picked.length < want) picked.push(...stale.slice(0, want - picked.length))
  return shuffle(rng, picked)
}

/** Append ids to the seen list, newest last, without duplicates, capped. */
export function markSeen(recent: readonly number[], ids: readonly number[]): number[] {
  const drop = new Set(ids)
  return [...recent.filter((id) => !drop.has(id)), ...ids].slice(-SEEN_CAP)
}

/** Question of the day: the same date key always gives the same question from the whole bank. */
export function drawDaily(bank: Bank, date: string): Question {
  const rng = mulberry32(hashSeed(`pub-trivia:${date}`))
  return bank.rows[randomInt(rng, 0, bank.rows.length - 1)]!
}

export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function shiftDate(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y!, m! - 1, d! + days, 12))
}

/** Consecutive days answered, counting back from today, or from yesterday if today is still open. */
export function streakOf(history: Record<string, 'got' | 'miss'>, today: string): number {
  let day = history[today] ? today : shiftDate(today, -1)
  let n = 0
  while (history[day]) {
    n++
    day = shiftDate(day, -1)
  }
  return n
}

export interface Round {
  title: string
  rows: Question[]
  /** Category name when the round sits in one category, else null. */
  category: string | null
}

/** Themed rounds are consecutive rows sharing one round title, kept in bank order. */
export function groupRounds(bank: Bank): Round[] {
  const out: Round[] = []
  for (const row of bank.rows) {
    if (!row.r) continue
    const last = out[out.length - 1]
    if (last && last.title === row.r && last.rows.length < 8) last.rows.push(row)
    else out.push({ title: row.r, rows: [row], category: null })
  }
  for (const round of out) {
    const cats = new Set(round.rows.map((row) => row.c))
    round.category = cats.size === 1 ? bank.categories[round.rows[0]!.c]! : null
  }
  return out
}

export type Mark = 'got' | 'miss' | 'skip'

export interface Stats {
  answered: number
  correct: number
  byCat: Record<string, [number, number]>
}

export const EMPTY_STATS: Stats = { answered: 0, correct: 0, byCat: {} }

/** Move one card's result from `prev` to `next` (either may be undefined). Returns new stats. */
export function applyMark(stats: Stats, cat: number, prev: Mark | undefined, next: Mark | undefined): Stats {
  const count = (m: Mark | undefined) => (m === 'got' || m === 'miss' ? 1 : 0)
  const right = (m: Mark | undefined) => (m === 'got' ? 1 : 0)
  const key = String(cat)
  const [a, g] = stats.byCat[key] ?? [0, 0]
  const dA = count(next) - count(prev)
  const dG = right(next) - right(prev)
  return {
    answered: stats.answered + dA,
    correct: stats.correct + dG,
    byCat: { ...stats.byCat, [key]: [a + dA, g + dG] },
  }
}

export const percent = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)
