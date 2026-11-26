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

export interface EditHistory {
  /** Unique timestamp-based id. */
  id: number
  /** File name at the time of the edit. */
  fileName: string
  /** Human-readable filter description, or null if no filter was applied. */
  filter: string | null
  /** Transform that was applied, or null if none. */
  transform: string | null
  /** ISO timestamp of when the edit was applied. */
  timestamp: string
}

const KEY = 'lacuna.photo-editor.session.v1'
const HISTORY_KEY = 'lacuna.photo-editor.history.v1'

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

function isHistory(v: unknown): v is EditHistory[] {
  if (!Array.isArray(v)) return false
  return v.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === 'number' &&
      typeof (item as Record<string, unknown>).fileName === 'string' &&
      (typeof (item as Record<string, unknown>).filter === 'string' ||
        (item as Record<string, unknown>).filter === null) &&
      (typeof (item as Record<string, unknown>).transform === 'string' ||
        (item as Record<string, unknown>).transform === null) &&
      typeof (item as Record<string, unknown>).timestamp === 'string',
  )
}

const store = createMockValue<SessionState>({ key: KEY, fallback: EMPTY_SESSION, validate: isSession })

export function loadSession(): SessionState {
  return store.get() ?? EMPTY_SESSION
}

export function saveSession(state: SessionState): void {
  store.set(state)
}

const historyStore = createMockValue<EditHistory[]>({ key: HISTORY_KEY, fallback: [], validate: isHistory })

export function loadHistory(): EditHistory[] {
  return historyStore.get() ?? []
}

export function saveHistory(entries: EditHistory[]): void {
  historyStore.set(entries)
}
