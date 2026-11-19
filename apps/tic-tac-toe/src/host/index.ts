import { mockHost } from './mock'
import type { GameState, Mark } from './mock'

export type { GameState, Mark }

const host = mockHost

export function emptyBoard(): (Mark | null)[] {
  return [null, null, null, null, null, null, null, null, null]
}

export const loadGame = (): GameState => host.loadGame()
export const saveGame = (state: GameState) => host.saveGame(state)
export const clearStorage = () => host.clear()
