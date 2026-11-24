import { createMockValue } from '@lacuna/host-mock'

export interface Lap {
  label: string
  durationMs: number
}

export interface StopRecord {
  elapsedMs: number
  laps: Lap[]
  running: boolean
}

const fallback: StopRecord = { elapsedMs: 0, laps: [], running: false }

function isStopRecord(value: unknown): value is StopRecord {
  if (typeof value !== 'object' || value === null) return false
  const rec = value as Record<string, unknown>
  if (typeof rec.elapsedMs !== 'number' || !Number.isFinite(rec.elapsedMs) || rec.elapsedMs < 0) return false
  if (typeof rec.running !== 'boolean') return false
  if (!Array.isArray(rec.laps)) return false
  return (rec.laps as unknown[]).every((l) => {
    if (typeof l !== 'object' || l === null) return false
    const lap = l as Record<string, unknown>
    return typeof lap.label === 'string' && typeof lap.durationMs === 'number' && Number.isFinite(lap.durationMs) && lap.durationMs >= 0
  })
}

const record = createMockValue<StopRecord>({
  key: 'stopwatch-record',
  fallback,
  validate: isStopRecord,
})

export function loadRecord(): StopRecord {
  return record.get()
}

export function saveRecord(rec: StopRecord): void {
  record.set(rec)
}

export function clearRecord(): void {
  record.clear()
}
