// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// All host calls live behind this directory; src/host/mock.ts is the localStorage mock the app runs on.
import { createMockRecordStore } from '@lacuna/host-mock'

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export type HashEncoding = 'hex' | 'base64' | 'url'

export interface HistoryEntry {
  id: string
  input: string
  algorithm: HashAlgorithm
  encoding: HashEncoding
  digest: string
}

const KEY = 'lacuna.hash-generator.history'

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.input === 'string' &&
    (e.algorithm === 'SHA-1' || e.algorithm === 'SHA-256' || e.algorithm === 'SHA-512') &&
    (e.encoding === 'hex' || e.encoding === 'base64' || e.encoding === 'url') &&
    typeof e.digest === 'string'
  )
}

export const historyStore = createMockRecordStore<HistoryEntry>({
  key: KEY,
  validate: isHistoryEntry,
  idPrefix: 'hash',
})
