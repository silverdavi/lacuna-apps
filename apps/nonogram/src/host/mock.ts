import { createMockValue } from '@lacuna/host-mock'

export type Session = {
  active: boolean
  seed: number
  size: number
  filled: Record<string, boolean>
  history: { seed: number; at: number; solved: boolean }[]
  best: number | null
}

const SESSION_KEY = 'lacuna.nonogram.session'

function isSession(v: unknown): v is Session {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.seed === 'number' && typeof o.size === 'number'
}

function makeStore() {
  return createMockValue<Session>({
    key: SESSION_KEY,
    fallback: { active: false, seed: 1, size: 5, filled: {}, history: [], best: null },
    validate: isSession,
  })
}

export const host = {
  records: {
    nonogram: {
      get(id: string): Session | undefined {
        const store = makeStore()
        return id === 'session' ? store.get() : undefined
      },
      update(id: string, patch: Partial<Omit<Session, 'id'>>): void {
        if (id !== 'session') return
        const store = makeStore()
        const cur = store.get()
        store.set({ ...cur, ...patch })
      },
      add(record: Omit<Session, 'id'> & { id?: string }): void {
        const store = makeStore()
        const cur = store.get()
        store.set({ ...cur, ...record })
      },
      remove(id: string): void {
        if (id !== 'session') return
        const store = makeStore()
        store.clear()
      },
    },
  },
}
