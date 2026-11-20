import { loadPaletteRecord, savePaletteRecord, type PaletteRecord } from './mock'

export type { PaletteRecord }

export const host = {
  loadPalette(): PaletteRecord | null {
    return loadPaletteRecord()
  },
  savePalette(record: PaletteRecord): void {
    savePaletteRecord(record)
  },
}
