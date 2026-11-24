// Host boundary for the Image Resizer app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { HistoryEntry, HistoryState } from './mock'
export { loadHistory, saveHistory } from './mock'
