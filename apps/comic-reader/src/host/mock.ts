// Local session store for the Comic Book Reader. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the open
// file, the current page, and the bookmarks. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export type PageSize = 'Fit width' | 'Fit page'

export interface ComicSession {
  /** Data URL of the open comic, or null when nothing is loaded. */
  dataUrl: string | null
  /** File name of the open comic, e.g. "test-comic.cbz". */
  fileName: string | null
  /** 0-based index of the visible page. */
  page: number
  /** 1-based page numbers the reader marked. */
  bookmarks: number[]
  pageSize: PageSize
}

const KEY = 'lacuna.comic-reader.session.v1'

export const EMPTY_SESSION: ComicSession = {
  dataUrl: null,
  fileName: null,
  page: 0,
  bookmarks: [],
  pageSize: 'Fit width',
}

function isSession(v: unknown): v is ComicSession {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    (typeof s.dataUrl === 'string' || s.dataUrl === null) &&
    (typeof s.fileName === 'string' || s.fileName === null) &&
    typeof s.page === 'number' &&
    Array.isArray(s.bookmarks) &&
    s.bookmarks.every((n) => typeof n === 'number' && Number.isInteger(n) && n > 0) &&
    (s.pageSize === 'Fit width' || s.pageSize === 'Fit page')
  )
}

const store = createMockValue<ComicSession>({ key: KEY, fallback: EMPTY_SESSION, validate: isSession })

export function loadSession(): ComicSession {
  return store.get() ?? EMPTY_SESSION
}

export function saveSession(session: ComicSession): void {
  store.set(session)
}
