export interface PaletteRecord {
  id: string
  baseHex: string
  scheme: string
  swatches: string[]
  savedAt: string
}

const KEY = 'lacuna.palette-generator.record'

export function loadPaletteRecord(): PaletteRecord | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PaletteRecord
    if (typeof parsed.baseHex !== 'string' || !parsed.baseHex) return null
    if (!Array.isArray(parsed.swatches)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePaletteRecord(record: PaletteRecord): void {
  window.localStorage.setItem(KEY, JSON.stringify(record))
}
