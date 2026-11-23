import { cryptoRng, mulberry32, randomInt, type Rng } from '@lacuna/random'

export type Unit = 'Sentences' | 'Words' | 'Paragraphs'

export interface LoremRequest {
  seed: string
  unit: Unit
  count: number
}

export const SEED_SENTENCE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
export const OPENING = 'Lorem ipsum dolor sit amet'

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation',
  'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat',
  'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse',
  'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat',
  'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit',
  'anim', 'id', 'est', 'laborum', 'vestibulum', 'curabitur', 'nunc', 'fringilla',
  'phasellus', 'integer', 'maecenas', 'aliquam', 'pretium', 'suspendisse', 'viverra',
  'mauris', 'class', 'aptent', 'tortor', 'posuere', 'tincidunt', 'porta', 'volutpat',
  'congue', 'dictum', 'justo', 'placerat', 'ligula', 'blandit', 'luctus', 'nibh',
  'quisque', 'curae', 'habitasse', 'platea', 'dictumst', 'lorem', 'integer', 'odio',
  'condimentum', 'consectetur', 'malesuada', 'nibh', 'sodales', 'blandit', 'litora',
  'torquent', 'per', 'dapibus', 'felis', 'aenean', 'vestibulum', 'sem', 'gravida',
  'rutrum', 'quisque', 'eget', 'tortor', 'aliquet', 'morbi', 'habitasse', 'enim',
]

function wordsFor(rng: Rng, n: number): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) out.push(WORDS[randomInt(rng, 0, WORDS.length - 1)])
  return out
}

function sentence(rng: Rng, opening: boolean): string {
  if (opening) return SEED_SENTENCE
  const words = wordsFor(rng, 7 + randomInt(rng, 0, 6))
  const body = words.join(' ')
  return `${body.charAt(0).toUpperCase()}${body.slice(1)}.`
}

export function generateLorem({ seed, unit, count }: LoremRequest): string {
  const clamped = Math.max(1, Math.min(500, Math.trunc(count) || 1))
  const rng: Rng = seed.trim() !== ''
    ? mulberry32(Math.abs(Math.trunc(Number(seed.trim()))) || 0)
    : cryptoRng()

  if (unit === 'Words') {
    const words = wordsFor(rng, clamped)
    return words.join(' ')
  }

  if (unit === 'Sentences') {
    const parts: string[] = []
    for (let i = 0; i < clamped; i++) parts.push(sentence(rng, i === 0 && OPENING.startsWith('Lorem')))
    return parts.join(' ')
  }

  const parts: string[] = []
  for (let i = 0; i < clamped; i++) {
    const sentences: string[] = []
    const n = 6 + randomInt(rng, 0, 5)
    for (let j = 0; j < n; j++) sentences.push(sentence(rng, i === 0 && j === 0))
    parts.push(sentences.join(' '))
  }
  return parts.join('\n\n')
}
