import { entryStore, historyStore, type EntryDoc, type EncryptedPayload, type Snapshot } from './mock'

export { entryStore, historyStore, type EntryDoc, type EncryptedPayload, type Snapshot }

export function loadEntry(): { plaintext: string | null; encrypted: unknown } {
  return entryStore.get()
}

export function saveEntry(next: EntryDoc) {
  entryStore.set(next)
}
