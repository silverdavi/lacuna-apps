import { createMockRecordStore } from '@lacuna/host-mock'

export type Base = 'Binary' | 'Octal' | 'Decimal' | 'Hexadecimal' | 'Roman'

export interface Conversion {
  id: string
  value: string
  fromBase: Base
  result: string
  toBase: Base
  savedAt: number
}

const KEY = 'lacuna.base-converter.history.v1'

const BASES: readonly Base[] = ['Binary', 'Octal', 'Decimal', 'Hexadecimal', 'Roman']

function isConversion(v: unknown): v is Conversion {
  const c = v as {
    id?: unknown
    value?: unknown
    fromBase?: unknown
    result?: unknown
    toBase?: unknown
    savedAt?: unknown
  }
  return (
    typeof c.id === 'string' &&
    typeof c.value === 'string' &&
    typeof c.result === 'string' &&
    typeof c.savedAt === 'number' &&
    BASES.includes(c.fromBase as Base) &&
    BASES.includes(c.toBase as Base)
  )
}

export const store = createMockRecordStore<Conversion>({
  key: KEY,
  validate: isConversion,
})
