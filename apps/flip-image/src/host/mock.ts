export interface ImageRecord {
  id: 'image'
  name: string
  dataUrl: string
  width: number
  height: number
  flipH: boolean
  flipV: boolean
  rotations: number
}

const KEY = 'lacuna.flip-image.image'

export function readImage(): ImageRecord | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ImageRecord
    if (typeof parsed.dataUrl !== 'string' || typeof parsed.name !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function writeImage(record: ImageRecord): void {
  localStorage.setItem(KEY, JSON.stringify(record))
}

export function clearImage(): void {
  localStorage.removeItem(KEY)
}
