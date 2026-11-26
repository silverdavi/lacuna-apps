// Host boundary for the Comic Book Reader. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { ComicSession, PageSize } from './mock'
export { EMPTY_SESSION, loadSession, saveSession } from './mock'
