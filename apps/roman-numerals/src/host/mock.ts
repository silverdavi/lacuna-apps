import { createMockRecordStore } from '@lacuna/host-mock'

export interface Conversion {
  id: string
  number: number
  numeral: string
}

const KEY = 'lacuna.roman-numerals.conversions.v1'

function isConversion(v: unknown): v is Conversion {
  const c = v as { id?: unknown; number?: unknown; numeral?: unknown }
  return (
    typeof c.id === 'string' &&
    typeof c.number === 'number' &&
    Number.isInteger(c.number) &&
    c.number >= 1 &&
    c.number <= 3999 &&
    typeof c.numeral === 'string'
  )
}

export const store = createMockRecordStore<Conversion>({
  key: KEY,
  validate: isConversion,
})
