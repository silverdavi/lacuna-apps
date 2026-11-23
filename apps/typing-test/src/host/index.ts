import { loadTestState, saveTestState, type TypingTestState } from './mock'

export type { TypingTestState }

export const host = {
  loadTest(): TypingTestState | null {
    return loadTestState()
  },
  saveTest(state: TypingTestState): void {
    saveTestState(state)
  },
}
