import { localStorageMock } from './mock'
import type { GameState, Storage } from './mock'

// All persistence for the app goes through this module. In production this
// would delegate to the host API (records); today the mock keeps the state in
// localStorage so the game survives a reload.

export const storage: Storage = localStorageMock

export function loadState(): GameState {
  return storage.load() ?? { symbols: [], faceUp: [], locked: [], score: 0, best: 0 }
}

export function saveState(state: GameState): void {
  storage.save(state)
}
