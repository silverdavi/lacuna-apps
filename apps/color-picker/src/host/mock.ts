export interface ColorRecord {
  id: string
  hex: string
  palette: string[]
  savedAt: string
}

const KEY = 'lacuna.color-picker.record'

export function loadColorRecord(): ColorRecord | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ColorRecord
    if (typeof parsed.hex !== 'string' || !parsed.hex) return null
    return parsed
  } catch {
    return null
  }
}

export function saveColorRecord(record: ColorRecord): void {
  window.localStorage.setItem(KEY, JSON.stringify(record))
}
