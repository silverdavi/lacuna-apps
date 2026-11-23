import { entryStore, type EntryDoc, type EncryptedPayload } from './mock'

export { entryStore, type EntryDoc, type EncryptedPayload }

export function loadEntry(): { plaintext: string | null; encrypted: unknown } {
  return entryStore.get()
}

export function saveEntry(next: EntryDoc) {
  entryStore.set(next)
}
