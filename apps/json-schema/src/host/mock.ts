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

export const mockHost: Host = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as Partial<ValidationState>
      if (
        typeof data.data !== 'string' ||
        typeof data.schema !== 'string' ||
        !['pass', 'fail', 'invalid-data'].includes(data.status as ValidationStatus)
      ) {
        return null
      }
      return {
        data: data.data,
        schema: data.schema,
        status: data.status as ValidationStatus,
        errors: Array.isArray(data.errors) ? data.errors.filter((e) => typeof e === 'string') : [],
      }
    } catch {
      return null
    }
  },
  saveState(state: ValidationState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; state stays in memory only
    }
  },
}
