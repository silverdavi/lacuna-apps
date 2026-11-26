import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

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

const faviconSets = createMockRecordStore<FaviconSetRecord>({
  key: 'favicon-generator:sets',
  validate: isFaviconSet,
  idPrefix: 'favset',
})

function isLatest(value: unknown): value is Omit<FaviconSetRecord, 'id'> {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
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

const latest = createMockValue<Omit<FaviconSetRecord, 'id'> | null>({
  key: 'favicon-generator:latest',
  fallback: null,
  validate: isLatest,
})

export function saveFaviconSet(record: Omit<FaviconSetRecord, 'id'>): FaviconSetRecord {
  const stored = faviconSets.add(record)
  latest.set({
    fileName: stored.fileName,
    sourceUrl: stored.sourceUrl,
    previewUrl: stored.previewUrl,
    shape: stored.shape,
    quality: stored.quality,
    size: stored.size,
    generatedAt: stored.generatedAt,
  })
  return stored
}

export function listFaviconSets(): FaviconSetRecord[] {
  return faviconSets.list()
}

export function loadLatest(): Omit<FaviconSetRecord, 'id'> | null {
  const record = latest.get()
  if (!record) return null
  return {
    fileName: record.fileName,
    sourceUrl: record.sourceUrl,
    previewUrl: record.previewUrl,
    shape: record.shape,
    quality: record.quality,
    size: record.size,
    generatedAt: record.generatedAt,
  }
}
