// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createVaultStore, type VaultDocument } from './mock'

const store = createVaultStore()

export function listDocuments(): VaultDocument[] {
  return store.list()
}

export function addDocument(name: string, size: number, content: string): VaultDocument {
  return store.add({ name, size, content })
}

export function removeDocument(id: string): boolean {
  return store.remove(id)
}

export function replaceAllDocuments(records: VaultDocument[]): void {
  store.replaceAll(records)
}
