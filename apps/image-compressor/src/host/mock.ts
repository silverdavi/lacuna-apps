export type ImageFormat = 'image/png' | 'image/jpeg'

export interface CompressOptions {
  format: ImageFormat
  quality: string
  width: string
}

export type OptionsStorage = {
  load(): CompressOptions | null
  save(options: CompressOptions): void
}

const KEY = 'lacuna.image-compressor.options'

const FORMATS: ImageFormat[] = ['image/png', 'image/jpeg']

export const defaultOptions: CompressOptions = {
  format: 'image/png',
  quality: '85',
  width: '',
}

function isFormat(value: unknown): value is ImageFormat {
  return typeof value === 'string' && (FORMATS as string[]).includes(value)
}

function read(): CompressOptions | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CompressOptions>
    return {
      format: isFormat(parsed.format) ? parsed.format : defaultOptions.format,
      quality: typeof parsed.quality === 'string' ? parsed.quality : defaultOptions.quality,
      width: typeof parsed.width === 'string' ? parsed.width : defaultOptions.width,
    }
  } catch {
    return null
  }
}

export const localStorageMock: OptionsStorage = {
  load: read,
  save(options: CompressOptions) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(options))
    } catch {
      // storage unavailable; options live for the session only
    }
  },
}
