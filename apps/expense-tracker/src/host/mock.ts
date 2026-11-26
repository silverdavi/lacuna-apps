export type Category = 'Food' | 'Housing' | 'Transport' | 'Utilities' | 'Other'

export const CATEGORIES: Category[] = ['Food', 'Housing', 'Transport', 'Utilities', 'Other']

export interface Transaction {
  id: string
  date: string
  description: string
  category: Category
  amount: number
}

export interface Budget {
  id: string
  category: Category
  amount: number
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as string[]).includes(value)
}

export function isTransactionData(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.date === 'string' &&
    typeof v.description === 'string' &&
    isCategory(v.category) &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount)
  )
}

export function isBudgetData(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return isCategory(v.category) && typeof v.amount === 'number' && Number.isFinite(v.amount)
}

export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
