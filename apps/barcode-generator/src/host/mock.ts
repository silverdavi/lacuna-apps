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

export const mockHost: Host = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<BarcodeState>
      const data = typeof parsed.data === 'string' ? parsed.data : ''
      if (data.length === 0) return null
      const type = TYPES.includes(parsed.type as BarcodeType)
        ? (parsed.type as BarcodeType)
        : 'code128'
      const preview = typeof parsed.preview === 'string' ? parsed.preview : ''
      const previewLabel = typeof parsed.previewLabel === 'string' ? parsed.previewLabel : ''
      if (!preview || !previewLabel) return null
      return { type, data, preview, previewLabel }
    } catch {
      return null
    }
  },
  saveState(state: BarcodeState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; state stays in memory only
    }
  },
}
