// Host boundary for the Photo Editor app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { SessionState, EditHistory } from './mock'
export { loadSession, saveSession, loadHistory, saveHistory } from './mock'
