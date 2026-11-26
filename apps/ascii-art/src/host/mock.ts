import { createMockValue } from '@lacuna/host-mock'

export interface AsciiArtRecord {
  text: string
  source: 'text' | 'image'
  characterSet: string
  width: number
}

export interface Host {
  loadRecord(): AsciiArtRecord | null
  saveRecord(record: AsciiArtRecord): void
}

const KEY = 'lacuna.ascii-art.last'

export const DEFAULT_RECORD: AsciiArtRecord = {
  text: '',
  source: 'text',
  characterSet: 'Default',
  width: 80,
}

function isRecord(v: unknown): v is AsciiArtRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.text === 'string' &&
    (r.source === 'text' || r.source === 'image') &&
    typeof r.characterSet === 'string' &&
    typeof r.width === 'number' &&
    Number.isFinite(r.width)
  )
}

const store = createMockValue<AsciiArtRecord>({ key: KEY, fallback: DEFAULT_RECORD, validate: isRecord })

export const mockHost: Host = {
  loadRecord() {
    return store.get()
  },
  saveRecord(record: AsciiArtRecord) {
    store.set(record)
  },
}
