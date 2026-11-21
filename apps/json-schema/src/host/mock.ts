import { createMockValue } from '@lacuna/host-mock'

export type ValidationStatus = 'pass' | 'fail' | 'invalid-data'

export interface ValidationState {
  data: string
  schema: string
  status: ValidationStatus
  errors: string[]
}

export interface Host {
  loadState(): ValidationState | null
  saveState(state: ValidationState): void
}

const KEY = 'lacuna.json-schema.state'

const EMPTY: ValidationState = { data: '', schema: '', status: 'pass', errors: [] }

function isValidationState(v: unknown): v is ValidationState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.data === 'string' &&
    typeof s.schema === 'string' &&
    (s.status === 'pass' || s.status === 'fail' || s.status === 'invalid-data')
  )
}

const store = createMockValue<ValidationState>({ key: KEY, fallback: EMPTY, validate: isValidationState })

export const mockHost: Host = {
  loadState() {
    const s = store.get()
    return s.data === '' && s.schema === '' ? null : s
  },
  saveState(state: ValidationState) {
    store.set(state)
  },
}
