import { createMockValue } from '@lacuna/host-mock'

export type BarcodeType = 'code128' | 'ean13' | 'qr'

export interface BarcodeState {
  type: BarcodeType
  data: string
  preview: string
  previewLabel: string
}

export interface Host {
  loadState(): BarcodeState | null
  saveState(state: BarcodeState): void
}

const KEY = 'lacuna.barcode-generator.state'
const TYPES: BarcodeType[] = ['code128', 'ean13', 'qr']

function isState(v: unknown): v is BarcodeState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    (s.type === undefined || TYPES.includes(s.type as BarcodeType)) &&
    typeof s.data === 'string' &&
    s.data.length > 0 &&
    typeof s.preview === 'string' &&
    s.preview.length > 0 &&
    typeof s.previewLabel === 'string' &&
    s.previewLabel.length > 0
  )
}

const store = createMockValue<BarcodeState | null>({ key: KEY, fallback: null, validate: isState })

export const mockHost: Host = {
  loadState() {
    const state = store.get()
    if (!state) return null
    return { type: state.type ?? 'code128', data: state.data, preview: state.preview, previewLabel: state.previewLabel }
  },
  saveState(state) {
    store.set(state)
  },
}
