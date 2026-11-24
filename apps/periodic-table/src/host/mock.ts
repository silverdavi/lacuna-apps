import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type Prefs = {
  selectedSymbol: string | null
  metalsOnly: boolean
}

export type Search = { id: string; symbol: string; name: string; at: number }

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

export const searches = createMockRecordStore<Search>({
  key: 'pt.searches',
  idPrefix: 's',
  validate: (v: unknown): v is Search => {
    const o = v as Record<string, unknown>
    return typeof o === 'object' && o !== null &&
      typeof o.id === 'string' &&
      typeof o.symbol === 'string' &&
      typeof o.name === 'string' &&
      typeof o.at === 'number'
  },
})
