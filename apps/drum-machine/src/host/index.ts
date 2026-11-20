import { mockHost } from './mock'
import type { PatternState } from './mock'

export type { PatternState }
export { STEPS } from './mock'

const host = mockHost

export const loadPattern = (): PatternState => host.loadPattern()
export const savePattern = (state: PatternState) => host.savePattern(state)
export const clearPattern = () => host.clear()
