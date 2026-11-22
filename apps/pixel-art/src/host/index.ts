// Host boundary for the Pixel Art Editor. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { EditorState, Layer } from './mock'
export { loadState, saveState } from './mock'
