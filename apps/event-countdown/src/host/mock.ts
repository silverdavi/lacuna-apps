// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockRecordStore } from '@lacuna/host-mock'

export type Event = {
  id: string
  name: string
  /** `YYYY-MM-DD` in the browser's local calendar. */
  date: string
  /** `HH:MM` 24-hour. */
  time: string
  createdAt: string
  /** Epoch ms the countdown is measured from; pinned at creation. */
  refEpoch: number
  /** Duration in milliseconds for events created via quick add; absent otherwise. */
  quickMs?: number
}

const validate = (value: unknown): value is Event => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<Event>
  return typeof v.name === 'string'
    && v.name.trim().length > 0
    && typeof v.date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(v.date)
    && typeof v.time === 'string'
    && /^\d{2}:\d{2}$/.test(v.time)
    && typeof v.refEpoch === 'number'
    && Number.isFinite(v.refEpoch)
}

function storageKey(): string {
  try {
    const el = document.getElementById('root')
    return el?.getAttribute('data-branch') ?? 'default'
  } catch {
    return 'default'
  }
}

export const STORAGE_KEY = `lacuna.event-countdown:${storageKey()}:events`

export function eventStore() {
  return createMockRecordStore<Event>({
    key: STORAGE_KEY,
    idPrefix: 'ev',
    validate,
  })
}
