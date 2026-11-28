// Host calls live behind this file. Settings stay on this device; the export is a local download.
const KEY = 'lacuna.totient-explorer.state'

export type Tab = 'Number' | 'Scan' | 'Carmichael' | 'About'
export type ScanFilter = 'Primes' | 'Carmichael' | 'Radimichael' | 'k-Lehmer' | 'Fermat-2'

export interface Saved {
  tab: Tab
  input: string
  from: string
  to: string
  filter: ScanFilter
  limit: string
}

export const DEFAULTS: Saved = {
  tab: 'Number',
  input: '561',
  from: '2',
  to: '10000',
  filter: 'Carmichael',
  limit: '10^5',
}

const TABS: Tab[] = ['Number', 'Scan', 'Carmichael', 'About']
const FILTERS: ScanFilter[] = ['Primes', 'Carmichael', 'Radimichael', 'k-Lehmer', 'Fermat-2']
const LIMITS = ['10^4', '10^5', '10^6']

export const mockStore = {
  load(): Saved {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return DEFAULTS
      const v = JSON.parse(raw) as Partial<Saved>
      const str = (x: unknown, d: string) => (typeof x === 'string' ? x.slice(0, 40) : d)
      return {
        tab: TABS.includes(v.tab as Tab) ? (v.tab as Tab) : DEFAULTS.tab,
        input: str(v.input, DEFAULTS.input),
        from: str(v.from, DEFAULTS.from),
        to: str(v.to, DEFAULTS.to),
        filter: FILTERS.includes(v.filter as ScanFilter) ? (v.filter as ScanFilter) : DEFAULTS.filter,
        limit: LIMITS.includes(v.limit as string) ? (v.limit as string) : DEFAULTS.limit,
      }
    } catch {
      return DEFAULTS
    }
  },
  save(state: Saved) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; settings live for this session only
    }
  },
  saveText(filename: string, text: string, type = 'text/csv') {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
