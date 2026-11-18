import { loadPaintRecord, savePaintRecord, type PaintRecord } from './mock'

export type { PaintRecord }

export const host = {
  loadPaint(): PaintRecord | null {
    return loadPaintRecord()
  },
  savePaint(record: PaintRecord): void {
    savePaintRecord(record)
  },
}
