import { faviconSets, type FaviconSetRecord } from './mock'

export type { FaviconSetRecord }

export function saveFaviconSet(record: Omit<FaviconSetRecord, 'id'>): FaviconSetRecord {
  return faviconSets.add(record)
}

export function listFaviconSets(): FaviconSetRecord[] {
  return faviconSets.list()
}

export function removeFaviconSet(id: string): boolean {
  return faviconSets.remove(id)
}
