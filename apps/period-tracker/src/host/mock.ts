import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface PeriodRecord {
  id: string
  start: string
  length: number
  createdAt: string
}

export interface PeriodSettings {
  defaultLength: number
}

const PERIODS_KEY = 'lacuna.period-tracker.periods'
const SETTINGS_KEY = 'lacuna.period-tracker.settings'

function isPeriodRecord(value: unknown): value is PeriodRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<PeriodRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.start === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.start) &&
    typeof record.length === 'number' &&
    record.length >= 1 &&
    typeof record.createdAt === 'string'
  )
}

function isPeriodSettings(value: unknown): value is PeriodSettings {
  if (typeof value !== 'object' || value === null) return false
  const settings = value as Partial<PeriodSettings>
  return typeof settings.defaultLength === 'number' && settings.defaultLength >= 1
}

const periodsStore = createMockRecordStore<PeriodRecord>({
  key: PERIODS_KEY,
  validate: isPeriodRecord,
  idPrefix: 'period-',
})

const settingsStore = createMockValue<PeriodSettings>({
  key: SETTINGS_KEY,
  fallback: { defaultLength: 5 },
  validate: isPeriodSettings,
})

export const host = {
  listPeriods(): PeriodRecord[] {
    return periodsStore.list()
  },

  addPeriod(start: string, length: number, createdAt: string): PeriodRecord {
    return periodsStore.add({ start, length, createdAt })
  },

  deletePeriod(id: string): void {
    periodsStore.remove(id)
  },

  getSettings(): PeriodSettings {
    return settingsStore.get()
  },

  saveSettings(settings: PeriodSettings): void {
    settingsStore.set(settings)
  },
}
