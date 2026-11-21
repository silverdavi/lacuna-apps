// Space-scoped persistence for the coin flip.
// The app keeps one small record in the space's mock store (localStorage) so it
// works with no network. State is rehydrated on load and saved on every change.

export type Side = 'Heads' | 'Tails'

export type FlipState = {
  side: Side
  streak: number
  best: number
}

export const initialState = (): FlipState => ({
  side: 'Tails',
  streak: 0,
  best: 0,
})

const KEY = 'lacuna.coin-flip.state'

export function isValidState(value: unknown): value is FlipState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (v.side === 'Heads' || v.side === 'Tails') &&
    typeof v.streak === 'number' &&
    Number.isFinite(v.streak) &&
    v.streak >= 0 &&
    typeof v.best === 'number' &&
    Number.isFinite(v.best) &&
    v.best >= 0
  )
}
