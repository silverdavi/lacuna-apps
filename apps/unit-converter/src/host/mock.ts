import type { ConversionRecord, HostApi } from './index'

const KEY = 'lacuna.unit-converter.recent.v1'
const MAX = 10

function read(): ConversionRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as ConversionRecord[]) : []
  } catch {
    return []
  }
}

export function createMockHost(): HostApi {
  return {
    async listRecent(): Promise<ConversionRecord[]> {
      return read()
    },
    async addRecent(record: ConversionRecord): Promise<void> {
      const next = [record, ...read()].slice(0, MAX)
      localStorage.setItem(KEY, JSON.stringify(next))
    },
  }
}
