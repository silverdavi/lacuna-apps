export interface PaintRecord {
  id: string
  image: string
  width: number
  height: number
  savedAt: string
}

const KEY = 'lacuna.paint.record'

export function loadPaintRecord(): PaintRecord | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PaintRecord
    if (typeof parsed.image !== 'string' || !parsed.image) return null
    return parsed
  } catch {
    return null
  }
}

export function savePaintRecord(record: PaintRecord): void {
  window.localStorage.setItem(KEY, JSON.stringify(record))
}
