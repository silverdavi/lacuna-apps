import { createMockValue } from '@lacuna/host-mock'

export interface TextDiffRecord {
  textA: string
  textB: string
  caseSensitive: boolean
}

export interface Host {
  loadRecord(): TextDiffRecord | null
  saveRecord(record: TextDiffRecord): void
}

const KEY = 'lacuna.text-diff.last'

export const DEFAULT_RECORD: TextDiffRecord = {
  textA: '',
  textB: '',
  caseSensitive: false,
}

function isRecord(v: unknown): v is TextDiffRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.textA === 'string' &&
    typeof r.textB === 'string' &&
    typeof r.caseSensitive === 'boolean'
  )
}

const store = createMockValue<TextDiffRecord>({ key: KEY, fallback: DEFAULT_RECORD, validate: isRecord })

export const mockHost: Host = {
  loadRecord() {
    return store.get()
  },
  saveRecord(record: TextDiffRecord) {
    store.set(record)
  },
}
