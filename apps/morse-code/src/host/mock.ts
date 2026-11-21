import { createMockRecordStore } from '@lacuna/host-mock'

export interface Conversion {
  id: string
  text: string
  morse: string
}

const KEY = 'lacuna.morse-code.conversions.v1'

function isConversion(v: unknown): v is Conversion {
  const c = v as { id?: unknown; text?: unknown; morse?: unknown }
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.text === 'string' &&
    typeof c.morse === 'string'
  )
}

export const store = createMockRecordStore<Conversion>({
  key: KEY,
  validate: isConversion,
})
