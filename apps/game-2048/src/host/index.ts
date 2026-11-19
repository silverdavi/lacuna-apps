import { store, type Direction, type SavedGame } from './mock'

export type { Direction, SavedGame }

export const host = {
  loadGame(): SavedGame {
    return store.load()
  },
  saveGame(state: SavedGame) {
    store.save(state)
  },
}
