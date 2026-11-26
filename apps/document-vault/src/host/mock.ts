// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'

export interface VaultDocument {
  id: string
  name: string
  size: number
  content: string
}

export function isVaultDocument(value: unknown): value is VaultDocument {
  const v = value as Record<string, unknown>
  return (
    typeof v?.id === 'string' &&
    typeof v?.name === 'string' &&
    typeof v?.size === 'number' &&
    Number.isFinite(v.size) &&
    typeof v?.content === 'string'
  )
}

export function createVaultStore(): MockRecordStore<VaultDocument> {
  return createMockRecordStore<VaultDocument>({
    key: 'lacuna.document-vault.documents',
    validate: isVaultDocument,
    idPrefix: 'doc',
  })
}
