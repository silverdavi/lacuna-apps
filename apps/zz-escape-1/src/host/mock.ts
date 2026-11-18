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

export function loadEntries(): BudgetEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry)
  } catch {
    return []
  }
}

export function saveEntries(entries: BudgetEntry[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(entries))
}
