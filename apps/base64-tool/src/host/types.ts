export type Encoding = 'base64' | 'hex' | 'url-base64'

export interface ConversionRecord {
  input: string
  encoding: Encoding
}

export interface RecordStore {
  load(key: string): ConversionRecord | null
  save(key: string, record: ConversionRecord): void
}

export const STORAGE_KEY = 'lacuna.base64-tool.last-conversion'
