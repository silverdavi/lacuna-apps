// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// coin flip's single record in a localStorage-backed value store so the whole
// app runs offline.
import { createMockValue } from '@lacuna/host-mock'
import { initialState, isValidState, type FlipState, type Side } from './index'

const KEY = 'lacuna.coin-flip.state'

const valueStore = createMockValue<FlipState>({
  key: KEY,
  fallback: initialState(),
  validate: isValidState,
})

export const host = {
  read(): FlipState {
    return valueStore.get()
  },

  write(next: FlipState): FlipState {
    valueStore.set(next)
    return next
  },

  reset(): FlipState {
    valueStore.clear()
    return valueStore.get()
  },
}

export { KEY }
export type { FlipState, Side }
