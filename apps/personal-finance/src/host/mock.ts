import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type TransactionType = 'income' | 'expense'
export type Account = 'Bank' | 'Cash' | 'Card'
export type Category =
  | 'Salary'
  | 'Housing'
  | 'Food'
  | 'Transport'
  | 'Leisure'
  | 'Other'

export interface Transaction {
  id: string
  description: string
  type: TransactionType
  amount: number
  account: Account
  category: Category
}

export interface Budgets {
  Salary: number
  Housing: number
  Food: number
  Transport: number
  Leisure: number
  Other: number
}

export const EXPENSE_CATEGORIES: readonly Category[] = [
  'Housing',
  'Food',
  'Transport',
  'Leisure',
  'Other',
]

export const ACCOUNTS: readonly Account[] = ['Bank', 'Cash', 'Card']

export const DEFAULT_BUDGETS: Budgets = {
  Salary: 0,
  Housing: 1500,
  Food: 500,
  Transport: 200,
  Leisure: 300,
  Other: 200,
}

export const BUDGET_CATEGORIES: readonly (keyof Budgets)[] = [
  'Housing',
  'Food',
  'Transport',
  'Leisure',
  'Other',
]

const TRANSACTIONS_KEY = 'lacuna.personal-finance.transactions'
const BUDGETS_KEY = 'lacuna.personal-finance.budgets'

export function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.description === 'string' &&
    (v.type === 'income' || v.type === 'expense') &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount) &&
    typeof v.account === 'string' &&
    typeof v.category === 'string'
  )
}

export function isBudgets(value: unknown): value is Budgets {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  for (const key of BUDGET_CATEGORIES) {
    if (typeof v[key] !== 'number' || !Number.isFinite(v[key] as number)) return false
  }
  return typeof v.Salary === 'number' && Number.isFinite(v.Salary)
}

export const transactionsStore = createMockRecordStore<Transaction>({
  key: TRANSACTIONS_KEY,
  validate: isTransaction,
})

export const budgetsStore = createMockValue<Budgets>({
  key: BUDGETS_KEY,
  fallback: DEFAULT_BUDGETS,
  validate: isBudgets,
})
