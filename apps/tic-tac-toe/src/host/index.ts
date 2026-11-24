import { mockHost, nextId } from './mock'
import type { GameState, GameRecord, Mark, Outcome } from './mock'

export type { GameState, GameRecord, Mark, Outcome }

const host = mockHost

export function emptyBoard(): (Mark | null)[] {
  return [null, null, null, null, null, null, null, null, null]
}

export const loadGame = (): GameState => host.loadGame()
export const saveGame = (state: GameState) => host.saveGame(state)
export const clearStorage = () => host.clear()
export const resetScores = (state: GameState) =>
  host.saveGame({ ...state, score: { x: 0, o: 0, draws: 0 }, history: [] })
export const makeRecord = (result: Outcome, moves: number): GameRecord => ({
  id: nextId(),
  result,
  moves,
  ...(result === 'draw' ? {} : { winner: result }),
})
