export type CodeFormat = 'QR Code' | 'EAN-13' | 'Code 128'

export interface CodeRecord {
  id: string
  kind: CodeFormat
  text: string
  code: string
  at: number
}

export interface ScannerState {
  records: CodeRecord[]
  lastEncode: CodeRecord | null
}

export interface Host {
  loadState(): ScannerState | null
  saveState(state: ScannerState): void
}

const KEY = 'lacuna.qr-scanner.state'
const KINDS: CodeFormat[] = ['QR Code', 'EAN-13', 'Code 128']

function asRecord(value: unknown): CodeRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Partial<CodeRecord>
  if (typeof r.id !== 'string' || typeof r.kind !== 'string' || typeof r.text !== 'string') return null
  if (!KINDS.includes(r.kind as CodeFormat)) return null
  if (typeof r.code !== 'string') return null
  const at = typeof r.at === 'number' ? r.at : 0
  return { id: r.id, kind: r.kind as CodeFormat, text: r.text, code: r.code, at }
}

export const mockHost: Host = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as Partial<ScannerState>
      const records = Array.isArray(data.records) ? data.records.map(asRecord).filter((r): r is CodeRecord => r !== null) : []
      const lastEncode = asRecord(data.lastEncode)
      return { records, lastEncode }
    } catch {
      return null
    }
  },
  saveState(state: ScannerState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; state stays in memory only
    }
  },
}
