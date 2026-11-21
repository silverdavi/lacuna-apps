// Host boundary for the Signature Pad app. Every persistence call goes
// through here; the implementation is a localStorage-backed mock via
// @lacuna/host-mock, so a reload keeps the drawn strokes and settings.
// No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface StrokePoint {
  x: number
  y: number
}

export interface Stroke {
  color: string
  width: number
  points: StrokePoint[]
}

export interface SignatureSession {
  strokes: Stroke[]
  color: string
  width: number
}

const KEY = 'lacuna.signature-pad.session.v1'

export const EMPTY_SESSION: SignatureSession = {
  strokes: [],
  color: 'ink',
  width: 3,
}

function isSession(v: unknown): v is SignatureSession {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (!Array.isArray(s.strokes)) return false
  if (typeof s.color !== 'string' || typeof s.width !== 'number') return false
  for (const stroke of s.strokes) {
    if (typeof stroke !== 'object' || stroke === null) return false
    const st = stroke as Record<string, unknown>
    if (typeof st.color !== 'string' || typeof st.width !== 'number') return false
    if (!Array.isArray(st.points)) return false
    for (const p of st.points) {
      if (typeof p !== 'object' || p === null) return false
      const pt = p as Record<string, unknown>
      if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return false
    }
  }
  return true
}

const store = createMockValue<SignatureSession>({
  key: KEY,
  fallback: EMPTY_SESSION,
  validate: isSession,
})

export function loadSession(): SignatureSession {
  return store.get()
}

export function saveSession(state: SignatureSession): void {
  store.set(state)
}
