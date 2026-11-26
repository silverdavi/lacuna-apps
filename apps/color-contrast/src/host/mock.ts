import { useLocalRecord } from '@lacuna/use-local-record'

export interface ColorPair {
  foreground: string
  background: string
}

export interface PairStore {
  pairs: ColorPair[]
}

const KEY = 'lacuna.color-contrast.pairs'
const VERSION = 1

const HEX_RE = /^[0-9a-f]{6}$/i

function isValidHex(v: string): boolean {
  const s = v.trim().replace(/^#/, '')
  return HEX_RE.test(s)
}

export function usePairStore() {
  const { value, set, hydrated } = useLocalRecord<PairStore>({
    key: KEY,
    version: VERSION,
    defaultValue: { pairs: [] },
    migrations: {
      0: (old) => {
        const o = old as { pairs?: unknown } | null
        const raw = Array.isArray(o?.pairs) ? o!.pairs : []
        const pairs = raw.filter((entry): entry is ColorPair => {
          const c = entry as Record<string, unknown> | null
          if (!c || typeof c !== 'object') return false
          if (typeof c.foreground !== 'string' || !isValidHex(c.foreground)) return false
          if (typeof c.background !== 'string' || !isValidHex(c.background)) return false
          return true
        })
        return { pairs }
      },
    },
  })
  return { pairs: value.pairs, set, hydrated }
}
