// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// The countdown timer persists its clock in localStorage via @lacuna/host-mock,
// so a reload keeps the paused clock in place.
import { createMockValue } from '@lacuna/host-mock'

export interface TimerRecord {
  remainingMs: number
  totalMs: number
  running: boolean
}

export interface TimerHost {
  read(): Promise<TimerRecord | null>
  write(rec: TimerRecord): Promise<void>
  clear(): Promise<void>
}

const KEY = 'lacuna.countdown-timer'

const isValid = (v: unknown): v is TimerRecord => {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.remainingMs === 'number' &&
    Number.isFinite(r.remainingMs) &&
    r.remainingMs >= 0 &&
    typeof r.totalMs === 'number' &&
    Number.isFinite(r.totalMs) &&
    r.totalMs >= 0 &&
    typeof r.running === 'boolean'
  )
}

const store = createMockValue<TimerRecord | null>({
  key: KEY,
  fallback: null,
  validate: (v: unknown): v is TimerRecord => isValid(v),
})

export function mockTimerHost(): TimerHost {
  return {
    async read() {
      const rec = store.get()
      return rec ?? null
    },
    async write(rec) {
      store.set(rec)
    },
    async clear() {
      store.clear()
    },
  }
}
