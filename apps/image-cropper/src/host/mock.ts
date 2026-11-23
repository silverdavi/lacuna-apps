// Local session store for the Image Cropper app. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the loaded
// image and its current editing state. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface CropState {
  x: number
  y: number
  w: number
  h: number
}

export interface SessionState {
  /** PNG data URL of the current working image, or null when nothing is loaded. */
  image: string | null
  width: number
  height: number
  /** Original image, kept for before/after comparison, or null. */
  original: string | null
  crop: CropState
  filter: string
}

const KEY = 'lacuna.image-cropper.session.v1'

export const EMPTY_SESSION: SessionState = {
  image: null,
  width: 0,
  height: 0,
  original: null,
  crop: { x: 0, y: 0, w: 0, h: 0 },
  filter: 'None',
}

function isSession(v: unknown): v is SessionState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    (typeof s.image === 'string' || s.image === null) &&
    typeof s.width === 'number' &&
    typeof s.height === 'number' &&
    (typeof s.original === 'string' || s.original === null) &&
    typeof s.crop === 'object' &&
    s.crop !== null &&
    typeof s.filter === 'string'
  )
}

const store = createMockValue<SessionState>({ key: KEY, fallback: EMPTY_SESSION, validate: isSession })

export function loadSession(): SessionState {
  return store.get() ?? EMPTY_SESSION
}

export function saveSession(state: SessionState): void {
  store.set(state)
}
