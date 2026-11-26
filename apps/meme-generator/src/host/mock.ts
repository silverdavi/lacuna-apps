// Local session store for the Meme Maker app. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the loaded
// image, its captions and its adjustments. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface ImagePayload {
  /** Raw image bytes (PNG). Stored as a plain number[] so it survives JSON. */
  bytes: number[]
  /** Name of the uploaded file, e.g. "cat.png". */
  name: string
  /** MIME type of the image, e.g. "image/png". */
  type: string
}

export interface MemeSession {
  /** The loaded image as raw bytes, or null until one is loaded. */
  image: ImagePayload | null
  width: number
  height: number
  /** Name of the uploaded file, e.g. "cat.png". */
  name: string
  topText: string
  bottomText: string
  filter: string
  /** Number of 90° clockwise rotations applied to the base image. */
  rotations: number
  flipped: boolean
}

export interface HistoryEntry {
  id: string
  at: number
  top: string
  bottom: string
  filter: string
  width: number
  height: number
  png: string
}

const SESSION_KEY = 'lacuna.meme-generator.session.v1'
const HISTORY_KEY = 'lacuna.meme-generator.history.v1'

export const EMPTY_SESSION: MemeSession = {
  image: null,
  width: 0,
  height: 0,
  name: '',
  topText: '',
  bottomText: '',
  filter: 'None',
  rotations: 0,
  flipped: false,
}

function isSession(v: unknown): v is MemeSession {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    (s.image === null || (
      typeof s.image === 'object' &&
      Array.isArray((s.image as Record<string, unknown>).bytes) &&
      typeof (s.image as Record<string, unknown>).name === 'string' &&
      typeof (s.image as Record<string, unknown>).type === 'string'
    )) &&
    typeof s.width === 'number' &&
    typeof s.height === 'number' &&
    typeof s.name === 'string' &&
    typeof s.topText === 'string' &&
    typeof s.bottomText === 'string' &&
    typeof s.filter === 'string' &&
    typeof s.rotations === 'number' &&
    typeof s.flipped === 'boolean'
  )
}

function isHistory(v: unknown): v is HistoryEntry[] {
  if (!Array.isArray(v)) return false
  return v.every((e) => {
    if (typeof e !== 'object' || e === null) return false
    const r = e as Record<string, unknown>
    return (
      typeof r.id === 'string' &&
      typeof r.at === 'number' &&
      typeof r.top === 'string' &&
      typeof r.bottom === 'string' &&
      typeof r.filter === 'string' &&
      typeof r.width === 'number' &&
      typeof r.height === 'number' &&
      typeof r.png === 'string'
    )
  })
}

const sessionStore = createMockValue<MemeSession>({
  key: SESSION_KEY,
  fallback: EMPTY_SESSION,
  validate: isSession,
})

const historyStore = createMockValue<HistoryEntry[]>({
  key: HISTORY_KEY,
  fallback: [],
  validate: isHistory,
})

export function loadSession(): MemeSession {
  return sessionStore.get()
}

export function saveSession(state: MemeSession): void {
  sessionStore.set(state)
}

export function loadHistory(): HistoryEntry[] {
  return historyStore.get()
}

export function saveHistory(entries: HistoryEntry[]): void {
  historyStore.set(entries)
}
