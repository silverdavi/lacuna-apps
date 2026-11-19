import { store, type SavedGame } from './mock'

export type { SavedGame }

export const host = {
  loadGame(): SavedGame {
    return store.load()
  },
  saveGame(state: SavedGame) {
    store.save(state)
  },
}
