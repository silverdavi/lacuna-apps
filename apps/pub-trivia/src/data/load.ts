import type { Bank } from '../deck'

let pending: Promise<Bank> | null = null

/** The bank is about 1 MB of JSON, so it loads as its own chunk after first paint. */
export function loadBank(): Promise<Bank> {
  pending ??= import('./trivia.json').then((m) => m.default as unknown as Bank)
  return pending
}
