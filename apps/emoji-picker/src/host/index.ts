import { createMockValue } from '@lacuna/host-mock'

const KEY = 'lacuna.emoji-picker.favorites'

function isValidFavorites(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

const store = createMockValue<string[]>({
  key: KEY,
  fallback: [],
  validate: isValidFavorites,
})

export function loadFavorites(): string[] {
  return store.get()
}

export function saveFavorites(chars: string[]): void {
  store.set(chars)
}
