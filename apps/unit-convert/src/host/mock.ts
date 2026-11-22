const KEY = 'lacuna.unit-convert.recent'
export const MAX_RECENT = 10

export interface ConversionRecord {
  id: string
  category: string
  fromUnit: string
  toUnit: string
  fromValue: string
  toValue: string
  at: number
}

function isConversionRecord(v: unknown): v is ConversionRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.category === 'string' &&
    typeof r.fromUnit === 'string' &&
    typeof r.toUnit === 'string' &&
    typeof r.fromValue === 'string' &&
    typeof r.toValue === 'string' &&
    typeof r.at === 'number'
  )
}

function loadAll(): ConversionRecord[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isConversionRecord)
  } catch {
    return []
  }
}

function saveAll(records: ConversionRecord[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(records))
}

function keyOf(r: ConversionRecord) {
  return [r.category, r.fromUnit, r.toUnit, r.fromValue, r.toValue].join('|')
}

export function listRecent(): ConversionRecord[] {
  return loadAll()
}

export function addRecent(record: Omit<ConversionRecord, 'id' | 'at'>): ConversionRecord[] {
  const fresh: ConversionRecord = { ...record, id: crypto.randomUUID(), at: Date.now() }
  const freshKey = keyOf(fresh)
  const kept = loadAll().filter((r) => r.category === record.category && keyOf(r) !== freshKey)
  const next = [fresh, ...kept].slice(0, MAX_RECENT)
  saveAll(next)
  return next
}

export function clearRecent(): void {
  saveAll([])
}
