import { createMockRecordStore } from '@lacuna/host-mock'

export interface Conversion {
  id: string
  source: string
  target: string
  date: string
  time: string
  result: string
}

const KEY = 'lacuna.timezone-converter.history.v1'

function isConversion(v: unknown): v is Conversion {
  const c = v as {
    id?: unknown
    source?: unknown
    target?: unknown
    date?: unknown
    time?: unknown
    result?: unknown
  }
  return (
    typeof c.id === 'string' &&
    typeof c.source === 'string' &&
    typeof c.target === 'string' &&
    typeof c.date === 'string' &&
    typeof c.time === 'string' &&
    typeof c.result === 'string'
  )
}

export const store = createMockRecordStore<Conversion>({
  key: KEY,
  validate: isConversion,
})
