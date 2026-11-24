// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Session {
  id: string
  subject: string
  date: string
  start: string
  duration: number
  done: boolean
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

const store = createMockRecordStore<Session>({
  key: 'study-planner.sessions',
  validate: isSession,
  idPrefix: 'session-',
})

export const listSessions = () => store.list()
export const addSession = (s: Omit<Session, 'id'>) => store.add(s)
export const updateSession = (id: string, patch: Partial<Omit<Session, 'id'>>) => store.update(id, patch)
export const removeSession = (id: string) => store.remove(id)
