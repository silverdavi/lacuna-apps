// Host boundary for the Meme Maker app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { MemeSession, HistoryEntry } from './mock'
export { loadSession, saveSession, loadHistory, saveHistory } from './mock'
