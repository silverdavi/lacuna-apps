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

let cache: ConversionRecord[] = load()

function load(): ConversionRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    return
  }
}

export function listRecent(): ConversionRecord[] {
  return [...cache]
}

export function addRecent(record: Omit<ConversionRecord, 'id' | 'at'>): ConversionRecord[] {
  const fresh: ConversionRecord = { ...record, id: crypto.randomUUID(), at: Date.now() }
  const freshKey = keyOf(fresh)
  const kept = cache.filter((r) => r.category === record.category && keyOf(r) !== freshKey)
  cache = [fresh, ...kept, ...cache.filter((r) => r.category !== record.category)].slice(0, MAX_RECENT)
  save()
  return [...cache]
}

function keyOf(r: ConversionRecord) {
  return [r.category, r.fromUnit, r.toUnit, r.fromValue, r.toValue].join('|')
}

export function clearRecent(): void {
  cache = []
  save()
}
