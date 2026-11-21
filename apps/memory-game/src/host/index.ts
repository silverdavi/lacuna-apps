import { storage } from './mock'
import type { GameState } from './mock'

export function loadState(): GameState {
  return storage.load()
}

export function saveState(state: GameState): void {
  storage.save(state)
}
