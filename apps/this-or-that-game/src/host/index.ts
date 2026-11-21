import { mockHost } from './mock'
import type { Answer, GameState } from './mock'

export type { Answer, GameState }

export const loadGame = (): GameState => mockHost.loadGame()
export const saveGame = (state: GameState) => mockHost.saveGame(state)
export const clearStorage = () => mockHost.clear()
