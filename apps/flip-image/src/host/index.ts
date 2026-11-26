// Host boundary for the Image Flipper app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { Session } from './mock'
export { loadSession, saveSession } from './mock'
