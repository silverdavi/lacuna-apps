import { createMockValue } from '@lacuna/host-mock'

const KEY = 'lacuna.tex-snippet.source.v1'

function isSource(v: unknown): v is string {
  return typeof v === 'string'
}

export const store = createMockValue<string>({
  key: KEY,
  fallback: '',
  validate: isSource,
})
