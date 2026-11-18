import { loadEntries, saveEntries, type BudgetEntry, type EntryType } from './mock'

export type { BudgetEntry, EntryType }

let nextId = 1

function newId(): string {
  return `entry-${Date.now()}-${nextId++}`
}

export const host = {
  loadEntries(): BudgetEntry[] {
    return loadEntries()
  },
  addEntry(description: string, type: EntryType, amount: number): BudgetEntry[] {
    const entry: BudgetEntry = { id: newId(), description, type, amount }
    const entries = [...loadEntries(), entry]
    saveEntries(entries)
    return entries
  },
  deleteEntry(id: string): BudgetEntry[] {
    const entries = loadEntries().filter((entry) => entry.id !== id)
    saveEntries(entries)
    return entries
  },
}
