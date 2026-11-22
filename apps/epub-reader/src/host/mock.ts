// Local session store for the EPUB Reader. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the open
// book, the current page, and the bookmarks. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export type FontSize = 'Small' | 'Normal' | 'Large'

export interface EpubSession {
  /** Data URL of the open book, or null when nothing is loaded. */
  dataUrl: string | null
  /** File name of the open book, e.g. "test.epub". */
  fileName: string | null
  /** 0-based index of the visible page. */
  page: number
  /** 1-based page numbers the reader marked. */
  bookmarks: number[]
  fontSize: FontSize
}

const KEY = 'lacuna.epub-reader.session.v1'

export const EMPTY_SESSION: EpubSession = {
  dataUrl: null,
  fileName: null,
  page: 0,
  bookmarks: [],
  fontSize: 'Normal',
}

function isSession(v: unknown): v is EpubSession {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    (typeof s.dataUrl === 'string' || s.dataUrl === null) &&
    (typeof s.fileName === 'string' || s.fileName === null) &&
    typeof s.page === 'number' &&
    Array.isArray(s.bookmarks) &&
    s.bookmarks.every((n) => typeof n === 'number' && Number.isInteger(n) && n > 0) &&
    (s.fontSize === 'Small' || s.fontSize === 'Normal' || s.fontSize === 'Large')
  )
}

const store = createMockValue<EpubSession>({ key: KEY, fallback: EMPTY_SESSION, validate: isSession })

export function loadSession(): EpubSession {
  return store.get() ?? EMPTY_SESSION
}

export function saveSession(session: EpubSession): void {
  store.set(session)
}
