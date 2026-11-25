import { mockHost } from './mock'
import type { Outcome, PersistedState, Round } from './mock'

export type { Outcome, PersistedState, Round }

export const loadState = (): PersistedState => mockHost.load()
export const saveState = (state: PersistedState) => mockHost.save(state)
