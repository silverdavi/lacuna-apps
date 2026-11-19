import { store, type GameState } from './mock'

export type { GameState }

export const host = {
  loadGame(): GameState {
    return store.load()
  },
  saveBest(best: number) {
    store.saveBest(best)
  },
  resetScore() {
    store.reset()
  },
}
