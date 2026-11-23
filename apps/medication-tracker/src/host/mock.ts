import { createMockRecordStore } from '@lacuna/host-mock'

export interface Medication {
  id: string
  name: string
  dose: string
  time: string
}

export interface DoseLog {
  id: string
  medicationId: string
  medicationName: string
  dose: string
  time: string
  loggedAt: string
}

const MED_KEY = 'lacuna.medication-tracker.meds.v1'
const DOSE_KEY = 'lacuna.medication-tracker.doses.v1'

function isMedication(v: unknown): v is Medication {
  const m = v as { id?: unknown; name?: unknown; dose?: unknown; time?: unknown }
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.dose === 'string' &&
    typeof m.time === 'string'
  )
}

function isDoseLog(v: unknown): v is DoseLog {
  const d = v as {
    id?: unknown
    medicationId?: unknown
    medicationName?: unknown
    dose?: unknown
    time?: unknown
    loggedAt?: unknown
  }
  return (
    typeof d.id === 'string' &&
    typeof d.medicationId === 'string' &&
    typeof d.medicationName === 'string' &&
    typeof d.dose === 'string' &&
    typeof d.time === 'string' &&
    typeof d.loggedAt === 'string'
  )
}

export const medStore = createMockRecordStore<Medication>({
  key: MED_KEY,
  validate: isMedication,
})

export const doseStore = createMockRecordStore<DoseLog>({
  key: DOSE_KEY,
  validate: isDoseLog,
})
