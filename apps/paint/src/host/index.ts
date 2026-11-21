import { createMockValue } from '@lacuna/host-mock'
import { applyRecordToCanvas, recordFromCanvas, type PaintRecord } from './mock'

export type { PaintRecord }

const KEY = 'lacuna.paint.record'

function isValidRecord(value: unknown): value is PaintRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.pixels === 'string' &&
    v.pixels.length > 0 &&
    typeof v.width === 'number' &&
    typeof v.height === 'number' &&
    typeof v.savedAt === 'string'
  )
}

const recordStore = createMockValue<PaintRecord>({
  key: KEY,
  fallback: { id: '', pixels: '', width: 0, height: 0, savedAt: '' },
  validate: isValidRecord,
})

export const host = {
  loadPaint(): PaintRecord | null {
    const record = recordStore.get()
    return record.pixels ? record : null
  },
  savePaint(record: PaintRecord): void {
    recordStore.set(record)
  },
  recordFromCanvas(canvas: HTMLCanvasElement): PaintRecord {
    return recordFromCanvas(canvas)
  },
  applyRecordToCanvas(canvas: HTMLCanvasElement, record: PaintRecord): void {
    applyRecordToCanvas(canvas, record)
  },
}
