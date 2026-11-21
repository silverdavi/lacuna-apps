import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface LoanRecord {
  principal: string
  rate: string
  years: string
}

export interface SavedLoan {
  id: string
  principal: string
  rate: string
  years: string
  monthlyPayment: number
  savedAt: number
}

const KEY = 'lacuna.loan-calculator.record'
const SAVED_KEY = 'lacuna.loan-calculator.saved'

export const emptyLoan: LoanRecord = {
  principal: '',
  rate: '',
  years: '',
}

function isLoan(value: unknown): value is LoanRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.principal === 'string' &&
    typeof v.rate === 'string' &&
    typeof v.years === 'string'
  )
}

function isSavedLoan(value: unknown): value is SavedLoan {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.principal === 'string' &&
    typeof v.rate === 'string' &&
    typeof v.years === 'string' &&
    typeof v.monthlyPayment === 'number' &&
    Number.isFinite(v.monthlyPayment) &&
    typeof v.savedAt === 'number'
  )
}

const store = createMockValue<LoanRecord>({
  key: KEY,
  fallback: emptyLoan,
  validate: isLoan,
})

const savedStore = createMockRecordStore<SavedLoan>({
  key: SAVED_KEY,
  validate: isSavedLoan,
  idPrefix: 'loan',
})

export function loadLoan(): LoanRecord {
  return store.get()
}

export function saveLoan(record: LoanRecord): void {
  store.set(record)
}

export function listSavedLoans(): SavedLoan[] {
  return savedStore.list()
}

export function addSavedLoan(record: Omit<SavedLoan, 'id'>): SavedLoan {
  return savedStore.add(record)
}

export function removeSavedLoan(id: string): boolean {
  return savedStore.remove(id)
}
