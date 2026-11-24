import {
  ACCOUNTS,
  BUDGET_CATEGORIES,
  DEFAULT_BUDGETS,
  budgetsStore,
  isBudgets,
  isTransaction,
  transactionsStore,
  type Account,
  type Budgets,
  type Category,
  type Transaction,
  type TransactionType,
} from './mock'

export type { Account, Budgets, Category, Transaction, TransactionType }
export { ACCOUNTS, BUDGET_CATEGORIES, DEFAULT_BUDGETS, isBudgets, isTransaction }

export const host = {
  listTransactions(): Transaction[] {
    return transactionsStore.list()
  },
  addTransaction(
    description: string,
    type: TransactionType,
    amount: number,
    account: Account,
    category: Category,
  ): Transaction[] {
    transactionsStore.add({ description, type, amount, account, category })
    return transactionsStore.list()
  },
  deleteTransaction(id: string): Transaction[] {
    transactionsStore.remove(id)
    return transactionsStore.list()
  },
  getBudgets(): Budgets {
    return budgetsStore.get()
  },
  setBudget(category: keyof Budgets, amount: number): Budgets {
    const next: Budgets = { ...DEFAULT_BUDGETS, ...budgetsStore.get(), [category]: amount }
    budgetsStore.set(next)
    return next
  },
}
