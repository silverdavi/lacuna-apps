import { createMockRecordStore } from '@lacuna/host-mock'

export type EntryType = 'income' | 'expense'

export interface BudgetEntry {
  id: string
  description: string
  type: EntryType
  amount: number
}

const KEY = 'lacuna.budget-planner.entries'

function isEntry(value: unknown): value is BudgetEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.description === 'string' &&
    (v.type === 'income' || v.type === 'expense') &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount)
  )
}

export const store = createMockRecordStore<BudgetEntry>({
  key: KEY,
  validate: isEntry,
})

export function loadEntries(): BudgetEntry[] {
  return store.list()
}

export function saveEntries(entries: BudgetEntry[]): void {
  store.replaceAll(entries)
}
