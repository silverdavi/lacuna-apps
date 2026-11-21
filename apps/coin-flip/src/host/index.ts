// Space-scoped persistence for the coin flip.
// The app keeps one small record in the space's mock store (localStorage) so it
// works with no network. State is rehydrated on load and saved on every change.

export type Side = 'Heads' | 'Tails'

export type FlipState = {
  side: Side
  streak: number
  best: number
  history: Side[]
}

export const initialState = (): FlipState => ({
  side: 'Tails',
  streak: 0,
  best: 0,
  history: [],
})

const KEY = 'lacuna.coin-flip.state'

export function isValidState(value: unknown): value is FlipState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const historyOk =
    Array.isArray(v.history) &&
    v.history.every((s) => s === 'Heads' || s === 'Tails')
  return (
    (v.side === 'Heads' || v.side === 'Tails') &&
    typeof v.streak === 'number' &&
    Number.isFinite(v.streak) &&
    v.streak >= 0 &&
    typeof v.best === 'number' &&
    Number.isFinite(v.best) &&
    v.best >= 0 &&
    historyOk
  )
}
