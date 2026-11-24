// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMemoryStorage, createMockRecordStore, type StorageLike } from '@lacuna/host-mock'

export interface Session {
  id: string
  subject: string
  date: string
  start: string
  duration: number
  done: boolean
  primary?: boolean
  twinOf?: string
}

export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.subject === 'string' &&
    typeof v.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    typeof v.start === 'string' &&
    /^\d{2}:\d{2}$/.test(v.start) &&
    typeof v.duration === 'number' &&
    v.duration > 0 &&
    typeof v.done === 'boolean'
  )
}

function rec(): StorageLike {
  try {
    const ls = globalThis.sessionStorage
    ls.setItem('study-planner.ping', '1')
    ls.removeItem('study-planner.ping')
    return ls
  } catch {
    return createMemoryStorage()
  }
}

const store = () =>
  createMockRecordStore<Session>({
    key: 'study-planner.sessions',
    validate: isSession,
    idPrefix: 'session-',
    storage: {
      getItem: (k) => rec().getItem(k),
      setItem: (k, v) => rec().setItem(k, v),
      removeItem: (k) => rec().removeItem(k),
    },
  })

function removePair(id: string) {
  const st = store()
  const target = st.get(id)
  if (!target) return
  const twin = st.list().find((s) => s.id !== id && s.subject === target.subject && s.start === target.start && s.duration === target.duration)
  if (twin) st.remove(twin.id)
  st.remove(id)
}

export const listSessions = () => store().list()
export const addSession = (s: Omit<Session, 'id'>) => store().add(s)
export const addRecurring = (s: { primary: Omit<Session, 'id'>; twin: Omit<Session, 'id'> }) => {
  const st = store()
  const primary = st.add({ ...s.primary, primary: true })
  st.add({ ...s.twin, twinOf: primary.id })
}
export const updateSession = (id: string, patch: Partial<Omit<Session, 'id'>>) => store().update(id, patch)
export const removeSession = (id: string) => store().remove(id)
export const removeRecurringPair = (id: string) => {
  removePair(id)
}
