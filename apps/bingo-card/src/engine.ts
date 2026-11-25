import { mulberry32, shuffle, type Rng } from '@lacuna/random'

export const FREE = 'FREE'

export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function generateCard(seedText: string, min: number, max: number, size: number): string[] {
  const count = size * size
  const poolSize = max - min + 1
  if (count > poolSize) throw new RangeError('Not enough numbers for the grid')
  const rng: Rng = mulberry32(fnv1a(seedText))
  const pool: number[] = Array.from({ length: poolSize }, (_, i) => min + i)
  const picked = shuffle(rng, pool).slice(0, count)
  const center = Math.floor(count / 2)
  return picked.map((n, i) => (i === center ? FREE : String(n)))
}

export function cardText(card: string[], size: number): string {
  const lines: string[] = []
  for (let row = 0; row < size; row++) {
    lines.push(card.slice(row * size, row * size + size).join(' '))
  }
  return lines.join('\n')
}
