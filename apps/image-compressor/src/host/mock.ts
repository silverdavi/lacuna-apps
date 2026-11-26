import { createMockValue } from '@lacuna/host-mock'

export interface Persisted {
  quality: string
  width: string
}

export const KEY = 'image-compressor.options'
export const VERSION = 1

export const DEFAULT_PERSISTED: Persisted = {
  quality: '85',
  width: '',
}

export const store = createMockValue<Persisted>({
  key: KEY,
  fallback: DEFAULT_PERSISTED,
  validate: (v: unknown): v is Persisted => {
    const r = v as Record<string, unknown>
    return typeof r?.quality === 'string' && typeof r?.width === 'string'
  },
})

export function loadOptions(): Persisted {
  return store.get()
}

export function saveOptions(options: Persisted): void {
  store.set(options)
}
