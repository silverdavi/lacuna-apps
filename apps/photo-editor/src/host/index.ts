// Host boundary for the Photo Editor app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { SessionState } from './mock'
export { loadSession, saveSession } from './mock'
