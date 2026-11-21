// Host boundary for the Signature Pad app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { StrokePoint, Stroke, SignatureSession } from './mock'
export { loadSession, saveSession, EMPTY_SESSION } from './mock'
