import type { ConversionRecord, RecordStore } from './types'

function read(key: string): ConversionRecord | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const record = parsed as Record<string, unknown>
    if (typeof record.input !== 'string' || typeof record.encoding !== 'string') return null
    if (record.encoding !== 'base64' && record.encoding !== 'hex' && record.encoding !== 'url-base64') return null
    return { input: record.input, encoding: record.encoding }
  } catch {
    return null
  }
}

function write(key: string, record: ConversionRecord): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(record))
  } catch {
    // Quota or private-mode failures leave the conversion in memory only.
  }
}

export const mockStore: RecordStore = {
  load: read,
  save: write,
}
