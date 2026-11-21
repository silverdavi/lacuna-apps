export interface MemeRecord {
  image: string
  topText: string
  bottomText: string
  rotation: 0 | 90 | 180 | 270
  flip: boolean
  filter: 'none' | 'Grayscale'
}

const KEY = 'lacuna.meme-generator.record'

export function loadMemeRecord(): MemeRecord | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MemeRecord
    if (typeof parsed.image !== 'string' || !parsed.image) return null
    return {
      image: parsed.image,
      topText: typeof parsed.topText === 'string' ? parsed.topText : '',
      bottomText: typeof parsed.bottomText === 'string' ? parsed.bottomText : '',
      rotation: parsed.rotation === 90 || parsed.rotation === 180 || parsed.rotation === 270 ? parsed.rotation : 0,
      flip: typeof parsed.flip === 'boolean' ? parsed.flip : false,
      filter: parsed.filter === 'Grayscale' ? 'Grayscale' : 'none',
    }
  } catch {
    return null
  }
}

export function saveMemeRecord(record: MemeRecord): void {
  window.localStorage.setItem(KEY, JSON.stringify(record))
}
