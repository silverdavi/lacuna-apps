import { store, type Expense, type SplitMode } from './mock'

export type { Expense, SplitMode }

export function listExpenses(): Expense[] {
  return store.list()
}

export function addExpense(input: {
  description: string
  amount: number
  people: string[]
  mode: SplitMode
  percents: Record<string, number>
}): Expense {
  return store.add(input)
}

export function deleteExpense(id: string) {
  store.remove(id)
}
