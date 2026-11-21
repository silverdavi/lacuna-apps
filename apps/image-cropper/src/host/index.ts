// Host boundary for the Image Cropper app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { CropState, SessionState } from './mock'
export { loadSession, saveSession } from './mock'
