import { createMockValue } from '@lacuna/host-mock'

export interface StopRecord {
  running: boolean
  laps: number[]
}

const fallback: StopRecord = { running: false, laps: [] }

function isStopRecord(value: unknown): value is StopRecord {
  if (typeof value !== 'object' || value === null) return false
  const rec = value as Record<string, unknown>
  if (typeof rec.running !== 'boolean') return false
  if (!Array.isArray(rec.laps)) return false
  return (rec.laps as unknown[]).every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)
}

const record = createMockValue<StopRecord>({
  key: 'stopwatch-record',
  fallback,
  validate: isStopRecord,
})

export function loadRecord(): StopRecord {
  const v = record.get()
  return { running: v.running, laps: Array.isArray(v.laps) ? v.laps : [] }
}

export function saveRecord(rec: StopRecord): void {
  record.set(rec)
}

export function clearRecord(): void {
  record.clear()
}
