import { store, type GameState } from './mock'

export type { CellFlat, GameState, Level, Status } from './mock'

export const host = {
  loadGame(): GameState {
    return store.loadGame()
  },
  saveGame(state: GameState) {
    store.saveGame(state)
  },
  loadBest(): number {
    return store.loadBest()
  },
  saveBest(bestMs: number) {
    store.saveBest(bestMs)
  },
}
