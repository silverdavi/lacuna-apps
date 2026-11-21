import { createMockValue } from '@lacuna/host-mock'

export interface LoanRecord {
  principal: string
  rate: string
  years: string
}

const KEY = 'lacuna.loan-calculator.record'

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

const store = createMockValue<LoanRecord>({
  key: KEY,
  fallback: emptyLoan,
  validate: isLoan,
})

export function loadLoan(): LoanRecord {
  return store.get()
}

export function saveLoan(record: LoanRecord): void {
  store.set(record)
}
