// Local session store for the Image Flipper app. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the image
// you are working on and the transformations you applied to it.
// No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface Session {
  /** Data URL (PNG) of the original image. */
  image: string
  /** File name, e.g. "test.png". */
  name: string
  /** Whether a horizontal mirror has been applied. */
  flippedH: boolean
  /** Whether a vertical mirror has been applied. */
  flippedV: boolean
  /** Clockwise 90° quarter turns applied, modulo 4. */
  rotations: number
}

type SessionState = Session | null

const KEY = 'lacuna.flip-image.session.v1'

function isSession(v: unknown): v is Session {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.image === 'string' &&
    s.image.startsWith('data:image/') &&
    typeof s.name === 'string' &&
    typeof s.flippedH === 'boolean' &&
    typeof s.flippedV === 'boolean' &&
    typeof s.rotations === 'number'
  )
}

function isState(v: unknown): v is SessionState {
  return v === null || isSession(v)
}

const store = createMockValue<SessionState>({ key: KEY, fallback: null, validate: isState })

export function loadSession(): SessionState {
  return store.get()
}

export function saveSession(session: SessionState): void {
  store.set(session)
}
