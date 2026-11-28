// Host boundary for the Photo Gallery app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock.

export type { Photo, GalleryState } from './mock'
export { loadPhotos, savePhotos } from './mock'
