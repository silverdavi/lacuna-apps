// Crossword generator: pure, seeded, no DOM. Classic greedy placement run many times,
// keeping the best layout. The same seed and options always give the same puzzle.
import { CROSSWORD_CLUES } from './data/clues.ts'
import type { Category, CrosswordClue, Difficulty } from './data/clues.ts'

export type Dir = 'across' | 'down'
export type SizeKey = 'small' | 'medium' | 'large'
export type DifficultyChoice = Difficulty | 'mixed'

export interface Entry {
  answer: string
  clue: string
}

export interface Word extends Entry {
  /** Clue number in standard reading order. */
  n: number
  dir: Dir
  row: number
  col: number
}

/** JSON-safe puzzle. grid rows use '#' for a block and A-Z for the solution letter. */
export interface Puzzle {
  id: string
  title: string
  seed: string
  size: SizeKey | 'custom'
  rows: number
  cols: number
  grid: string[]
  across: Word[]
  down: Word[]
}

export const SIZES: Record<SizeKey, { n: number; label: string; min: number; max: number; need: number }> = {
  small: { n: 9, label: 'Small 9×9', min: 10, max: 14, need: 8 },
  medium: { n: 11, label: 'Medium 11×11', min: 14, max: 20, need: 12 },
  large: { n: 13, label: 'Large 13×13', min: 18, max: 28, need: 16 },
}

export const CUSTOM_MIN_WORDS = 5
export const BLOCK = '#'

// ---------------------------------------------------------------- seeded random

export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---------------------------------------------------------------- pool

export function poolFor(difficulty: DifficultyChoice, categories: Category[], maxLen: number): CrosswordClue[] {
  return CROSSWORD_CLUES.filter(
    (c) =>
      c.answer.length <= maxLen &&
      (difficulty === 'mixed' || c.difficulty === difficulty) &&
      (categories.length === 0 || categories.includes(c.category)),
  )
}

// ---------------------------------------------------------------- one attempt

interface Draft {
  n: number
  letters: string[][] // '' when empty
  dirs: number[][] // bit 1 = across word passes through, bit 2 = down
  placed: { entry: Entry; row: number; col: number; dir: Dir }[]
  crossings: number
  minR: number
  maxR: number
  minC: number
  maxC: number
}

const ACROSS = 1
const DOWN = 2

function newDraft(n: number): Draft {
  return {
    n,
    letters: Array.from({ length: n }, () => Array<string>(n).fill('')),
    dirs: Array.from({ length: n }, () => Array<number>(n).fill(0)),
    placed: [],
    crossings: 0,
    minR: n,
    maxR: -1,
    minC: n,
    maxC: -1,
  }
}

/** Returns the number of crossings when the word may go here, or -1 when it may not. */
function fits(d: Draft, word: string, row: number, col: number, dir: Dir): number {
  const dr = dir === 'down' ? 1 : 0
  const dc = dir === 'across' ? 1 : 0
  const { n, letters, dirs } = d
  const endR = row + dr * (word.length - 1)
  const endC = col + dc * (word.length - 1)
  if (row < 0 || col < 0 || endR >= n || endC >= n) return -1
  // The cells just before and after the word must be empty, so words never run end to end.
  const br = row - dr
  const bc = col - dc
  if (br >= 0 && bc >= 0 && letters[br][bc] !== '') return -1
  const ar = endR + dr
  const ac = endC + dc
  if (ar < n && ac < n && letters[ar][ac] !== '') return -1
  const own = dir === 'across' ? ACROSS : DOWN
  let crossings = 0
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i
    const c = col + dc * i
    const have = letters[r][c]
    if (have !== '') {
      if (have !== word[i]) return -1
      if (dirs[r][c] & own) return -1 // would overlap a word running the same way
      crossings++
    } else {
      // An empty cell may not touch another word side by side.
      const pr1 = r - dc
      const pc1 = c - dr
      const pr2 = r + dc
      const pc2 = c + dr
      if (pr1 >= 0 && pc1 >= 0 && letters[pr1][pc1] !== '') return -1
      if (pr2 < n && pc2 < n && letters[pr2][pc2] !== '') return -1
    }
  }
  return crossings
}

function put(d: Draft, entry: Entry, row: number, col: number, dir: Dir, crossings: number) {
  const dr = dir === 'down' ? 1 : 0
  const dc = dir === 'across' ? 1 : 0
  for (let i = 0; i < entry.answer.length; i++) {
    const r = row + dr * i
    const c = col + dc * i
    d.letters[r][c] = entry.answer[i]
    d.dirs[r][c] |= dir === 'across' ? ACROSS : DOWN
  }
  const endR = row + dr * (entry.answer.length - 1)
  const endC = col + dc * (entry.answer.length - 1)
  d.minR = Math.min(d.minR, row)
  d.minC = Math.min(d.minC, col)
  d.maxR = Math.max(d.maxR, endR)
  d.maxC = Math.max(d.maxC, endC)
  d.crossings += crossings
  d.placed.push({ entry, row, col, dir })
}

function boxGrowth(d: Draft, word: string, row: number, col: number, dir: Dir): number {
  const endR = row + (dir === 'down' ? word.length - 1 : 0)
  const endC = col + (dir === 'across' ? word.length - 1 : 0)
  const h = Math.max(d.maxR, endR) - Math.min(d.minR, row) + 1
  const w = Math.max(d.maxC, endC) - Math.min(d.minC, col) + 1
  return h * w - (d.maxR - d.minR + 1) * (d.maxC - d.minC + 1)
}

interface BuildOptions {
  n: number
  maxWords: number
  seed: string
  attempts: number
  budgetMs: number
}

function scoreOf(d: Draft): number {
  const letters = d.placed.reduce((s, p) => s + p.entry.answer.length, 0) - d.crossings
  const area = (d.maxR - d.minR + 1) * (d.maxC - d.minC + 1)
  return d.placed.length * 10 + d.crossings * 3 + (letters / area) * 40
}

function attempt(pool: Entry[], o: BuildOptions, rng: () => number): Draft | null {
  if (pool.length < 2) return null
  const d = newDraft(o.n)
  // Seed word: one of the longer words, across the middle row.
  const longest = pool.reduce((m, e) => Math.max(m, e.answer.length), 0)
  const longs = pool.filter((e) => e.answer.length >= Math.max(4, longest - 3))
  const seedWord = longs[Math.floor(rng() * longs.length)]
  const mid = Math.floor(o.n / 2)
  put(d, seedWord, mid, Math.floor((o.n - seedWord.answer.length) / 2), 'across', 0)
  // The rest, shuffled with a slight lean to short words, so each attempt differs.
  const rest = pool
    .filter((e) => e !== seedWord)
    .map((e) => ({ e, k: rng() * 5 - e.answer.length * 0.1 }))
    .sort((a, b) => b.k - a.k)
    .slice(0, 160)
    .map((x) => x.e)
  const used = new Set<Entry>([seedWord])
  for (let pass = 0; pass < 4 && d.placed.length < o.maxWords; pass++) {
    let any = false
    for (const entry of rest) {
      if (d.placed.length >= o.maxWords) break
      if (used.has(entry)) continue
      const w = entry.answer
      let best = -Infinity
      let pick: { row: number; col: number; dir: Dir; x: number } | null = null
      for (let r = d.minR; r <= d.maxR; r++) {
        for (let c = d.minC; c <= d.maxC; c++) {
          const ch = d.letters[r][c]
          if (ch === '') continue
          const mask = d.dirs[r][c]
          for (let i = 0; i < w.length; i++) {
            if (w[i] !== ch) continue
            // Cross a word that runs the other way.
            const dir: Dir | null = mask === ACROSS ? 'down' : mask === DOWN ? 'across' : null
            if (dir === null) continue
            const row = dir === 'down' ? r - i : r
            const col = dir === 'across' ? c - i : c
            const x = fits(d, w, row, col, dir)
            if (x < 1) continue
            const s = x * 4 - boxGrowth(d, w, row, col, dir) * 0.5 + rng()
            if (s > best) {
              best = s
              pick = { row, col, dir, x }
            }
          }
        }
      }
      if (pick) {
        put(d, entry, pick.row, pick.col, pick.dir, pick.x)
        used.add(entry)
        any = true
      }
    }
    if (!any) break
  }
  return d
}

function finish(d: Draft, id: string, title: string, seed: string, size: Puzzle['size']): Puzzle {
  const rows = d.maxR - d.minR + 1
  const cols = d.maxC - d.minC + 1
  const grid: string[] = []
  for (let r = d.minR; r <= d.maxR; r++) {
    let line = ''
    for (let c = d.minC; c <= d.maxC; c++) line += d.letters[r][c] || BLOCK
    grid.push(line)
  }
  const placed = d.placed.map((p) => ({ ...p, row: p.row - d.minR, col: p.col - d.minC }))
  const { across, down } = numberWords(grid, placed)
  return { id, title, seed, size, rows, cols, grid, across, down }
}

/** Standard numbering: scan in reading order, a cell that starts an across or down word gets the next number. */
export function numberWords(
  grid: string[],
  placed: { entry: Entry; row: number; col: number; dir: Dir }[],
): { across: Word[]; down: Word[]; numbers: number[][] } {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const filled = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols && grid[r][c] !== BLOCK
  const numbers: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0))
  let next = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!filled(r, c)) continue
      const startsAcross = !filled(r, c - 1) && filled(r, c + 1)
      const startsDown = !filled(r - 1, c) && filled(r + 1, c)
      if (startsAcross || startsDown) numbers[r][c] = next++
    }
  }
  const across: Word[] = []
  const down: Word[] = []
  for (const p of placed) {
    const w: Word = { ...p.entry, n: numbers[p.row][p.col], dir: p.dir, row: p.row, col: p.col }
    ;(p.dir === 'across' ? across : down).push(w)
  }
  across.sort((a, b) => a.n - b.n)
  down.sort((a, b) => a.n - b.n)
  return { across, down, numbers }
}

function build(pool: Entry[], o: BuildOptions, id: string, title: string, size: Puzzle['size']): Puzzle | null {
  const base = hashSeed(o.seed)
  const started = Date.now()
  let best: Draft | null = null
  let bestScore = -Infinity
  for (let k = 0; k < o.attempts; k++) {
    if (k >= 12 && Date.now() - started > o.budgetMs) break
    const d = attempt(pool, o, makeRng(base + Math.imul(k + 1, 0x9e3779b1)))
    if (!d || d.placed.length < 2) continue
    const s = scoreOf(d)
    if (s > bestScore) {
      bestScore = s
      best = d
    }
  }
  return best ? finish(best, id, title, o.seed, size) : null
}

// ---------------------------------------------------------------- public API

export interface GenOptions {
  size: SizeKey
  difficulty: DifficultyChoice
  categories: Category[]
  seed: string
  title?: string
  /** Attempts to try. A fixed count keeps the result the same on every device. */
  attempts?: number
  /** Stop early after this many milliseconds (at least 12 attempts always run). Omit for a device-independent result. */
  budgetMs?: number
}

export type GenResult =
  | { ok: true; puzzle: Puzzle }
  | { ok: false; placed: number; need: number; pool: number; reason: string }

export function generate(o: GenOptions): GenResult {
  const spec = SIZES[o.size]
  const pool = poolFor(o.difficulty, o.categories, spec.n)
  const puzzle = build(
    pool,
    { n: spec.n, maxWords: spec.max, seed: o.seed, attempts: o.attempts ?? 80, budgetMs: o.budgetMs ?? Infinity },
    `p-${o.seed}`,
    o.title ?? 'Crossword',
    o.size,
  )
  const placed = puzzle ? puzzle.across.length + puzzle.down.length : 0
  if (!puzzle || placed < spec.need) {
    return {
      ok: false,
      placed,
      need: spec.need,
      pool: pool.length,
      reason: `Only ${placed} of the ${spec.need} words this size needs would fit.`,
    }
  }
  return { ok: true, puzzle }
}

export function dailySeed(date: Date): string {
  const p = (x: number) => String(x).padStart(2, '0')
  return `daily-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/** The daily puzzle: medium, mixed difficulty, every category, fixed attempts so it matches on every device. */
export function generateDaily(date: Date): GenResult {
  const seed = dailySeed(date)
  const r = generate({ size: 'medium', difficulty: 'mixed', categories: [], seed, title: 'Daily crossword', attempts: 60 })
  return r
}

export function generateCustom(entries: Entry[], seed: string, title: string): GenResult {
  const n = 13
  const puzzle = build(entries, { n, maxWords: entries.length, seed, attempts: 150, budgetMs: 250 }, `c-${seed}`, title, 'custom')
  const placed = puzzle ? puzzle.across.length + puzzle.down.length : 0
  if (!puzzle || placed < 3) {
    return {
      ok: false,
      placed,
      need: 3,
      pool: entries.length,
      reason: 'These words share too few letters to cross. Add words that have letters in common.',
    }
  }
  return { ok: true, puzzle }
}

// ---------------------------------------------------------------- helpers shared with the UI and tests

export function allWords(p: Puzzle): Word[] {
  return [...p.across, ...p.down]
}

export function wordCells(w: Word): [number, number][] {
  return Array.from({ length: w.answer.length }, (_, i) => (w.dir === 'across' ? [w.row, w.col + i] : [w.row + i, w.col]))
}

/**
 * Checks the layout as a whole: every run of two or more letters is a placed word, every placed word
 * reads back from the grid, every word crosses another, and the grid is one connected piece.
 * Returns a list of problems, empty when the layout is sound.
 */
export function verify(p: Puzzle): string[] {
  const problems: string[] = []
  const at = (r: number, c: number) => (r >= 0 && c >= 0 && r < p.rows && c < p.cols ? p.grid[r][c] : BLOCK)
  const words = allWords(p)
  for (const w of words) {
    const read = wordCells(w)
      .map(([r, c]) => at(r, c))
      .join('')
    if (read !== w.answer) problems.push(`${w.answer} does not read back (${read})`)
  }
  const key = (w: Word) => `${w.dir}:${w.row}:${w.col}:${w.answer}`
  const known = new Set(words.map(key))
  for (const dir of ['across', 'down'] as Dir[]) {
    const dr = dir === 'down' ? 1 : 0
    const dc = dir === 'across' ? 1 : 0
    for (let r = 0; r < p.rows; r++) {
      for (let c = 0; c < p.cols; c++) {
        if (at(r, c) === BLOCK || at(r - dr, c - dc) !== BLOCK) continue
        let s = ''
        let rr = r
        let cc = c
        while (at(rr, cc) !== BLOCK) {
          s += at(rr, cc)
          rr += dr
          cc += dc
        }
        if (s.length >= 2 && !known.has(`${dir}:${r}:${c}:${s}`)) problems.push(`unplaced ${dir} run ${s} at ${r},${c}`)
      }
    }
  }
  const covers = (w: Word) => new Set(wordCells(w).map(([r, c]) => `${r},${c}`))
  for (const w of words) {
    const mine = covers(w)
    const crosses = words.some((o) => o !== w && o.dir !== w.dir && [...covers(o)].some((k) => mine.has(k)))
    if (!crosses) problems.push(`${w.answer} crosses no other word`)
  }
  // Connectivity of letter cells.
  const letters: string[] = []
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) if (at(r, c) !== BLOCK) letters.push(`${r},${c}`)
  if (letters.length) {
    const seen = new Set([letters[0]])
    const stack = [letters[0]]
    while (stack.length) {
      const [r, c] = stack.pop()!.split(',').map(Number)
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        const k = `${nr},${nc}`
        if (at(nr, nc) !== BLOCK && !seen.has(k)) {
          seen.add(k)
          stack.push(k)
        }
      }
    }
    if (seen.size !== letters.length) problems.push('grid is not connected')
  }
  return problems
}
