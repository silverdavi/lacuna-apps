import { createMockValue } from '@lacuna/host-mock'

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

const store = createMockValue<QrState | null>({
  key: KEY,
  fallback: null,
  validate: (v): v is QrState => {
    if (typeof v !== 'object' || v === null) return false
    const s = v as Record<string, unknown>
    return typeof s.content === 'string' && (s.content as string).length > 0 && LEVELS.includes(s.level as CorrectionLevel)
  },
})

export const mockHost: Host = {
  loadState() {
    const data = store.get()
    if (!data) return null
    return { content: data.content, level: data.level }
  },
  saveState(state) {
    store.set(state)
  },
}
