export type CorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrState {
  content: string
  level: CorrectionLevel
}

export interface Host {
  loadState(): QrState | null
  saveState(state: QrState): void
}

const KEY = 'lacuna.qr-generator.state'
const LEVELS: CorrectionLevel[] = ['L', 'M', 'Q', 'H']

export const mockHost: Host = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as Partial<QrState>
      if (typeof data.content !== 'string' || data.content.length === 0) return null
      const level = LEVELS.includes(data.level as CorrectionLevel)
        ? (data.level as CorrectionLevel)
        : 'L'
      return { content: data.content, level }
    } catch {
      return null
    }
  },
  saveState(state: QrState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; state stays in memory only
    }
  },
}
