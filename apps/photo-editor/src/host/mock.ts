// Local session store for the Photo Editor app. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the loaded
// image and its current edits. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface SessionState {
  /** Original PNG data URL of the image, or null when nothing is loaded. */
  original: string | null
  /** PNG data URL of the current image after applied edits, or null. */
  image: string | null
  /** Original file name, used for the export filename. */
  fileName: string
  /** Width of the original image. */
  width: number
  /** Height of the original image. */
  height: number
  /** Currently applied filter. */
  filter: string
  /** Currently applied transform. */
  transform: string
}

const KEY = 'lacuna.photo-editor.session.v1'

export const EMPTY_SESSION: SessionState = {
  original: null,
  image: null,
  fileName: '',
  width: 0,
  height: 0,
  filter: 'None',
  transform: 'None',
}

function isSession(v: unknown): v is SessionState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    (typeof s.original === 'string' || s.original === null) &&
    (typeof s.image === 'string' || s.image === null) &&
    typeof s.fileName === 'string' &&
    typeof s.width === 'number' &&
    typeof s.height === 'number' &&
    typeof s.filter === 'string' &&
    typeof s.transform === 'string'
  )
}

const store = createMockValue<SessionState>({ key: KEY, fallback: EMPTY_SESSION, validate: isSession })

export function loadSession(): SessionState {
  return store.get() ?? EMPTY_SESSION
}

export function saveSession(state: SessionState): void {
  store.set(state)
}
