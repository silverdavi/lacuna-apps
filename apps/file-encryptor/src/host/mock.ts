import { createMockValue } from '@lacuna/host-mock'

export interface Operation {
  id: string
  filename: string
  mode: string
  timestamp: string
}

export interface SessionState {
  defaultPassphrase: string
  operations: Operation[]
}

const KEY = 'lacuna.file-encryptor.session.v1'

export const EMPTY_SESSION: SessionState = {
  defaultPassphrase: '',
  operations: [],
}

function isSession(v: unknown): v is SessionState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (typeof s.defaultPassphrase !== 'string') return false
  if (!Array.isArray(s.operations)) return false
  return (s.operations as unknown[]).every((op) => {
    if (typeof op !== 'object' || op === null) return false
    const o = op as Record<string, unknown>
    return (
      typeof o.id === 'string' &&
      typeof o.filename === 'string' &&
      typeof o.mode === 'string' &&
      typeof o.timestamp === 'string'
    )
  })
}

const store = createMockValue<SessionState>({ key: KEY, fallback: EMPTY_SESSION, validate: isSession })

export function loadSession(): SessionState {
  return store.get()
}

export function saveSession(state: SessionState): void {
  store.set(state)
}
