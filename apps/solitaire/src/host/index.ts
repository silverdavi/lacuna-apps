import { makeMockStore, type GameState, type HostStore } from './mock'

export { SUIT_SYMBOL } from './mock'
export type { Card, GameState, HostStore, Pile, PileKind, Rank, Suit } from './mock'

let store: HostStore | null = null

export function getStore(): HostStore {
  if (!store) store = makeMockStore()
  return store
}

export function loadGame(): GameState | null {
  return getStore().load()
}

export function saveGame(state: GameState): void {
  getStore().save(state)
}
