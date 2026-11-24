// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'

export interface PasswordRecord {
  id: string
  name: string
  username: string
  password: string
  createdAt: string
  updatedAt: string
}

function isPasswordRecord(v: unknown): v is PasswordRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.name === 'string' &&
    typeof r.username === 'string' &&
    typeof r.password === 'string' &&
    typeof r.id === 'string'
  )
}

const store: MockRecordStore<PasswordRecord> = createMockRecordStore<PasswordRecord>({
  key: 'password-manager.passwords',
  validate: isPasswordRecord,
})

export const passwordStore = {
  list(): PasswordRecord[] {
    return store.list()
  },
  add(record: Omit<PasswordRecord, 'id'> & { id?: string }): PasswordRecord {
    return store.add(record)
  },
  update(id: string, patch: Partial<Omit<PasswordRecord, 'id'>>): PasswordRecord | undefined {
    return store.update(id, patch)
  },
  delete(id: string): boolean {
    return store.remove(id)
  },
}
