import { createMockRecordStore } from '@lacuna/host-mock'

export type SplitMode = 'Even' | 'Percentage'

export interface Expense {
  id: string
  description: string
  amount: number
  people: string[]
  mode: SplitMode
  percents: Record<string, number>
}

const KEY = 'lacuna.bill-splitter.mock.v1'

function isExpense(v: unknown): v is Expense {
  const e = v as {
    id?: unknown
    description?: unknown
    amount?: unknown
    people?: unknown
    mode?: unknown
    percents?: unknown
  }
  return (
    typeof e.id === 'string' &&
    typeof e.description === 'string' &&
    typeof e.amount === 'number' &&
    Number.isFinite(e.amount) &&
    Array.isArray(e.people) &&
    e.people.every((p) => typeof p === 'string') &&
    (e.mode === 'Even' || e.mode === 'Percentage') &&
    typeof e.percents === 'object' &&
    e.percents !== null &&
    !Array.isArray(e.percents) &&
    Object.values(e.percents).every((p) => typeof p === 'number' && Number.isFinite(p))
  )
}

export const store = createMockRecordStore<Expense>({
  key: KEY,
  validate: isExpense,
})
