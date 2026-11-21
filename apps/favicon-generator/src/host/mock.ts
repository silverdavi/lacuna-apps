import { createMockRecordStore, createMemoryStorage } from '@lacuna/host-mock'

export interface FaviconSetRecord {
  id: string
  fileName: string
  sourceUrl: string
  previewUrl: string
  shape: 'none' | 'square' | 'circle'
  quality: number
  size: number
  generatedAt: number
}

function isFaviconSet(value: unknown): value is FaviconSetRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.fileName === 'string' &&
    typeof record.sourceUrl === 'string' &&
    record.sourceUrl.startsWith('data:image/') &&
    typeof record.previewUrl === 'string' &&
    (record.shape === 'none' || record.shape === 'square' || record.shape === 'circle') &&
    typeof record.quality === 'number' &&
    typeof record.size === 'number' &&
    typeof record.generatedAt === 'number'
  )
}

const storage = createMemoryStorage()

export const faviconSets = createMockRecordStore<FaviconSetRecord>({
  key: 'favicon-generator:sets',
  validate: isFaviconSet,
  idPrefix: 'favset',
  storage,
})
