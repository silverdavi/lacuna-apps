import { createMockValue } from '@lacuna/host-mock'

export type Prefs = {
  selectedSymbol: string | null
  metalsOnly: boolean
}

export const prefs = createMockValue<Prefs>({
  key: 'pt.prefs',
  fallback: { selectedSymbol: null, metalsOnly: false },
  validate: (v: unknown): v is Prefs => {
    const o = v as Record<string, unknown>
    return typeof o === 'object' && o !== null &&
      (o.selectedSymbol === null || typeof o.selectedSymbol === 'string') &&
      typeof o.metalsOnly === 'boolean'
  },
})
