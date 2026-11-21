const KEY = 'lacuna.jwt-decoder.history'
const MAX = 50

export interface DecodedToken {
  token: string
  headerJson: string
  payloadJson: string
  signature: string
  label: string
  decodedAt: number
}

export interface HistoryStore {
  list(): DecodedToken[]
  add(entry: DecodedToken): void
}

function read(): DecodedToken[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is DecodedToken => (
      typeof x === 'object' && x !== null
      && typeof (x as DecodedToken).token === 'string'
      && typeof (x as DecodedToken).signature === 'string'
    ))
  } catch {
    return []
  }
}

function write(entries: DecodedToken[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // storage unavailable: keep in memory only
  }
}

export function createHistory(): HistoryStore {
  let cache: DecodedToken[] | null = null
  const load = (): DecodedToken[] => {
    cache = read()
    return cache
  }
  return {
    list() {
      if (cache === null) load()
      return cache ?? []
    },
    add(entry) {
      load()
      const next = [entry, ...(cache ?? [])].slice(0, MAX)
      cache = next
      write(next)
    },
  }
}
