// Local history store for the Image Resizer app. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the images
// you have processed. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface HistoryEntry {
  /** Stable id for the entry. */
  id: string
  /** Suggested download name, e.g. "resized-image.png". */
  name: string
  /** Output width in pixels. */
  width: number
  /** Output height in pixels. */
  height: number
  /** Output format, e.g. "PNG" or "JPEG". */
  format: string
  /** Unix ms timestamp of when the image was processed. */
  at: number
}

export type HistoryState = HistoryEntry[]

const KEY = 'lacuna.image-resizer.history.v1'

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.width === 'number' &&
    typeof e.height === 'number' &&
    typeof e.format === 'string' &&
    typeof e.at === 'number'
  )
}

function isHistory(v: unknown): v is HistoryState {
  return Array.isArray(v) && v.every(isHistoryEntry)
}

const store = createMockValue<HistoryState>({ key: KEY, fallback: [], validate: isHistory })

export function loadHistory(): HistoryState {
  return store.get() ?? []
}

export function saveHistory(entries: HistoryState): void {
  store.set(entries)
}
