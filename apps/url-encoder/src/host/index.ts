// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'

export type Entry = {
  id: string
  codec: string
  input: string
  result: string
}

const isEntry = (value: unknown): value is Entry => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.codec === 'string' && typeof v.input === 'string' && typeof v.result === 'string'
}

export const store: MockRecordStore<Entry> = createMockRecordStore<Entry>({
  key: 'lacuna.url-encoder.history',
  validate: isEntry,
})
