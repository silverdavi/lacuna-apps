import { createMockValue } from '@lacuna/host-mock'

export interface EncryptedPayload {
  salt: string
  iv: string
  ciphertext: string
  iterations: number
  hash?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
}

export interface EntryDoc {
  plaintext: string | null
  encrypted: EncryptedPayload | null
  /** Present when an empty entry was locked, so the passphrase can still be verified on unlock. */
  lockMarker?: string | null
}

export const ENTRY_KEY = 'lacuna.journal.mock.entry.v1'

function isPayload(v: unknown): v is EncryptedPayload {
  const p = v as {
    salt?: unknown
    iv?: unknown
    ciphertext?: unknown
    iterations?: unknown
    hash?: unknown
  }
  return (
    typeof p.salt === 'string' &&
    typeof p.iv === 'string' &&
    typeof p.ciphertext === 'string' &&
    typeof p.iterations === 'number'
  )
}

function isDoc(v: unknown): v is EntryDoc {
  const d = v as { plaintext?: unknown; encrypted?: unknown }
  const m = (d as EntryDoc).lockMarker
  return (
    typeof d === 'object' &&
    d !== null &&
    (d.plaintext === null || typeof d.plaintext === 'string') &&
    (d.encrypted === null || isPayload(d.encrypted)) &&
    (m === undefined || m === null || typeof m === 'string')
  )
}

export const entryStore = createMockValue<EntryDoc>({
  key: ENTRY_KEY,
  fallback: { plaintext: '', encrypted: null },
  validate: isDoc,
})
