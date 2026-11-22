// Local photo store for the Photo Gallery app. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the photos
// you have added. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface Photo {
  /** Stable id for the photo. */
  id: string
  /** Original file name, e.g. "sunset.jpg". */
  name: string
  /** Data URL of the image, possibly rotated. */
  dataUrl: string
  /** Original data URL before rotation. */
  original: string
  /** True when the current dataUrl is rotated 90deg. */
  rotated: boolean
  /** Width in pixels of the current image. */
  width: number
  /** Height in pixels of the current image. */
  height: number
  /** Unix ms timestamp of when the photo was added. */
  at: number
}

export type GalleryState = Photo[]

const KEY = 'lacuna.photo-gallery.photos.v1'

function isPhoto(v: unknown): v is Photo {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.dataUrl === 'string' &&
    typeof e.original === 'string' &&
    typeof e.rotated === 'boolean' &&
    typeof e.width === 'number' &&
    typeof e.height === 'number' &&
    typeof e.at === 'number'
  )
}

function isGallery(v: unknown): v is GalleryState {
  return Array.isArray(v) && v.every(isPhoto)
}

const store = createMockValue<GalleryState>({ key: KEY, fallback: [], validate: isGallery })

export function loadPhotos(): GalleryState {
  return store.get() ?? []
}

export function savePhotos(photos: GalleryState): void {
  store.set(photos)
}
