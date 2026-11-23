import { createMockValue } from '@lacuna/host-mock'

const KEY = 'lacuna.spreadsheet.save'

export type SheetData = Record<string, string>

export interface WorkbookRecord {
  id: string
  kind: 'workbook'
  sheets: { name: string; cells: SheetData }[]
  active: number
  updatedAt: number
}

export interface WorkbookHost {
  load(): WorkbookRecord | null
  save(record: WorkbookRecord): void
  clear(): void
}

function isWorkbook(value: unknown): value is WorkbookRecord {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.kind === 'workbook' &&
    Array.isArray(v.sheets) &&
    typeof v.active === 'number' &&
    (v.sheets as unknown[]).every(
      (s) =>
        s !== null &&
        typeof s === 'object' &&
        typeof (s as Record<string, unknown>).name === 'string' &&
        (s as Record<string, unknown>).cells !== null &&
        typeof (s as Record<string, unknown>).cells === 'object',
    )
  )
}

function makeMock(): WorkbookHost {
  const store = createMockValue<WorkbookRecord>({
    key: KEY,
    fallback: {
      id: 'workbook',
      kind: 'workbook',
      sheets: [{ name: 'Sheet1', cells: {} }],
      active: 0,
      updatedAt: 0,
    },
    validate: isWorkbook,
  })
  return {
    load() {
      return store.get()
    },
    save(record) {
      store.set({ ...record, updatedAt: Date.now() })
    },
    clear() {
      store.clear()
    },
  }
}

export const host: WorkbookHost = makeMock()
