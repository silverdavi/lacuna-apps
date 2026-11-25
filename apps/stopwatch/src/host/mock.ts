import { createMockValue } from '@lacuna/host-mock'

export interface Lap {
  label: string
  durationMs: number
}

export interface Session {
  id: string
  name: string
  totalMs: number
  laps: number
  savedAt: number
}

export interface StopRecord {
  elapsedMs: number
  laps: Lap[]
  running: boolean
  sessions: Session[]
}

const fallback: StopRecord = { elapsedMs: 0, laps: [], running: false, sessions: [] }

function isLap(value: unknown): value is Lap {
  if (typeof value !== 'object' || value === null) return false
  const lap = value as Record<string, unknown>
  return typeof lap.label === 'string' && typeof lap.durationMs === 'number' && Number.isFinite(lap.durationMs) && lap.durationMs >= 0
}

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.totalMs === 'number' &&
    Number.isFinite(s.totalMs) &&
    s.totalMs >= 0 &&
    typeof s.laps === 'number' &&
    Number.isFinite(s.laps) &&
    s.laps >= 0 &&
    typeof s.savedAt === 'number' &&
    Number.isFinite(s.savedAt)
  )
}

function isStopRecord(value: unknown): value is StopRecord {
  if (typeof value !== 'object' || value === null) return false
  const rec = value as Record<string, unknown>
  if (typeof rec.elapsedMs !== 'number' || !Number.isFinite(rec.elapsedMs) || rec.elapsedMs < 0) return false
  if (typeof rec.running !== 'boolean') return false
  if (!Array.isArray(rec.laps)) return false
  if ((rec.laps as unknown[]).some((l) => !isLap(l))) return false
  if (rec.sessions !== undefined && (!Array.isArray(rec.sessions) || (rec.sessions as unknown[]).some((s) => !isSession(s)))) return false
  return true
}

const record = createMockValue<StopRecord>({
  key: 'stopwatch-record',
  fallback,
  validate: isStopRecord,
})

export function loadRecord(): StopRecord {
  const rec = record.get()
  return { ...rec, sessions: rec.sessions ?? [] }
}

export function saveRecord(rec: StopRecord): void {
  record.set(rec)
}

export function clearRecord(): void {
  record.clear()
}
