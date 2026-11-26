import { cryptoRng, mulberry32, randomInt, type Rng } from '@lacuna/random'

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export interface Placement {
  word: string
  row: number
  col: number
  dr: number
  dc: number
}

const DIRS: Array<[number, number]> = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

export function parseWords(raw: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  for (const part of raw.split(/[,;\n]/)) {
    const word = part.trim().toUpperCase().replace(/[^A-Z]/g, '')
    if (word.length < 2) continue
    if (seen.has(word)) continue
    seen.add(word)
    words.push(word)
  }
  return words
}

function tryPlaceAll(words: string[], size: number, rng: Rng, attempts: number): string[][] | null {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const grid: string[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => ' '))
    let ok = true
    for (const word of words) {
      if (!placeWord(grid, size, word, rng)) {
        ok = false
        break
      }
    }
    if (ok) return grid
  }
  return null
}

function placeWord(grid: string[][], size: number, word: string, rng: Rng): boolean {
  if (word.length > size) return false
  const order = shuffleOrder(rng)
  for (const [dr, dc] of order) {
    for (let tries = 0; tries < 60; tries++) {
      const row = randomInt(rng, 0, size - 1)
      const col = randomInt(rng, 0, size - 1)
      const endRow = row + dr * (word.length - 1)
      const endCol = col + dc * (word.length - 1)
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue
      let fits = true
      for (let i = 0; i < word.length; i++) {
        const cell = grid[row + dr * i][col + dc * i]
        if (cell !== ' ' && cell !== word[i]) {
          fits = false
          break
        }
      }
      if (!fits) continue
      for (let i = 0; i < word.length; i++) {
        grid[row + dr * i][col + dc * i] = word[i]
      }
      return true
    }
  }
  return false
}

function shuffleOrder(rng: Rng): Array<[number, number]> {
  const order = [...DIRS]
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export function generatePuzzle(words: string[], size: number, seed?: number): string[][] {
  const rng = seed !== undefined ? mulberry32(seed) : cryptoRng()
  const longest = words.reduce((max, word) => Math.max(max, word.length), 0)
  if (longest <= size) {
    const grid = tryPlaceAll(words, size, rng, 400)
    if (grid) return fill(grid, size, rng)
  }
  // Fallback: fill the grid completely at random.
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => LETTERS[randomInt(rng, 0, LETTERS.length - 1)]),
  )
}

function fill(grid: string[][], size: number, rng: Rng): string[][] {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === ' ') {
        grid[row][col] = LETTERS[randomInt(rng, 0, LETTERS.length - 1)]
      }
    }
  }
  return grid
}

export function scoreFor(word: string): number {
  // A three-letter word is worth ten points; scoring scales with length.
  return Math.round((word.length * 10) / 3)
}

export function puzzleText(grid: string[][]): string {
  return grid.map((row) => row.join('')).join('')
}
