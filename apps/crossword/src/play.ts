// Play state and the pure operations on it. No React in here.
import { BLOCK, allWords, wordCells } from './generate.ts'
import type { Dir, Puzzle, Word } from './generate.ts'

export interface PlayState {
  /** One entry per cell: '' when empty, else the typed letter. */
  entries: string[][]
  revealed: boolean[][]
  wrong: boolean[][]
  elapsed: number
  checks: number
  reveals: number
  done: boolean
}

export interface Pos {
  r: number
  c: number
}

export function freshState(p: Puzzle): PlayState {
  const grid = <T,>(v: T) => Array.from({ length: p.rows }, () => Array<T>(p.cols).fill(v))
  return { entries: grid(''), revealed: grid(false), wrong: grid(false), elapsed: 0, checks: 0, reveals: 0, done: false }
}

export const isBlock = (p: Puzzle, r: number, c: number) => r < 0 || c < 0 || r >= p.rows || c >= p.cols || p.grid[r][c] === BLOCK
export const solution = (p: Puzzle, r: number, c: number) => p.grid[r][c]

export function numberAt(p: Puzzle): number[][] {
  const out = Array.from({ length: p.rows }, () => Array<number>(p.cols).fill(0))
  for (const w of allWords(p)) out[w.row][w.col] = w.n
  return out
}

/** Which across and down word (if any) passes through each cell. */
export function wordIndex(p: Puzzle): { across: (Word | null)[][]; down: (Word | null)[][] } {
  const mk = () => Array.from({ length: p.rows }, () => Array<Word | null>(p.cols).fill(null))
  const across = mk()
  const down = mk()
  for (const w of p.across) for (const [r, c] of wordCells(w)) across[r][c] = w
  for (const w of p.down) for (const [r, c] of wordCells(w)) down[r][c] = w
  return { across, down }
}

export const clueOrder = (p: Puzzle): Word[] => [...p.across, ...p.down]

export function isComplete(p: Puzzle, s: PlayState): boolean {
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) if (!isBlock(p, r, c) && s.entries[r][c] !== solution(p, r, c)) return false
  return true
}

export function wordFilled(s: PlayState, w: Word): boolean {
  return wordCells(w).every(([r, c]) => s.entries[r][c] !== '')
}

const copy = (s: PlayState): PlayState => ({
  ...s,
  entries: s.entries.map((x) => x.slice()),
  revealed: s.revealed.map((x) => x.slice()),
  wrong: s.wrong.map((x) => x.slice()),
})

export function typeLetter(s: PlayState, at: Pos, letter: string): PlayState {
  if (s.revealed[at.r][at.c]) return s
  const n = copy(s)
  n.entries[at.r][at.c] = letter
  n.wrong[at.r][at.c] = false
  return n
}

export function eraseLetter(s: PlayState, at: Pos): PlayState {
  if (s.revealed[at.r][at.c] || s.entries[at.r][at.c] === '') return s
  const n = copy(s)
  n.entries[at.r][at.c] = ''
  n.wrong[at.r][at.c] = false
  return n
}

export function cellsFor(p: Puzzle, scope: 'letter' | 'word' | 'puzzle', at: Pos, word: Word | null): Pos[] {
  if (scope === 'letter') return [at]
  if (scope === 'word') return word ? wordCells(word).map(([r, c]) => ({ r, c })) : []
  const out: Pos[] = []
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) if (!isBlock(p, r, c)) out.push({ r, c })
  return out
}

/** Marks filled cells that are wrong. Counts as one check. */
export function check(p: Puzzle, s: PlayState, cells: Pos[]): { state: PlayState; wrong: number } {
  const n = copy(s)
  let wrong = 0
  for (const { r, c } of cells) {
    const v = n.entries[r][c]
    const bad = v !== '' && v !== solution(p, r, c)
    n.wrong[r][c] = bad
    if (bad) wrong++
  }
  n.checks += 1
  return { state: n, wrong }
}

/** Fills the cells with their answers and marks them revealed. Each newly revealed letter counts once. */
export function reveal(p: Puzzle, s: PlayState, cells: Pos[]): PlayState {
  const n = copy(s)
  for (const { r, c } of cells) {
    if (n.revealed[r][c]) continue
    n.entries[r][c] = solution(p, r, c)
    n.revealed[r][c] = true
    n.wrong[r][c] = false
    n.reveals += 1
  }
  return n
}

export function clearAll(s: PlayState): PlayState {
  const n = copy(s)
  for (let r = 0; r < n.entries.length; r++)
    for (let c = 0; c < n.entries[r].length; c++) {
      n.entries[r][c] = ''
      n.revealed[r][c] = false
      n.wrong[r][c] = false
    }
  return n
}

export function startPos(p: Puzzle): { at: Pos; dir: Dir } {
  const w = p.across[0] ?? p.down[0]
  return { at: { r: w.row, c: w.col }, dir: w.dir }
}

export function formatTime(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
