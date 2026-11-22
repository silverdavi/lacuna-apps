// Host boundary for the EPUB Reader. Every persistence call goes through
// here; the implementation is a localStorage-backed mock.

export type { EpubSession, FontSize } from './mock'
export { EMPTY_SESSION, loadSession, saveSession } from './mock'
