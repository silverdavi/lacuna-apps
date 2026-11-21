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

export function loadLoan(): LoanRecord {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyLoan
    const parsed: unknown = JSON.parse(raw)
    if (!isLoan(parsed)) return emptyLoan
    return parsed
  } catch {
    return emptyLoan
  }
}

export function saveLoan(record: LoanRecord): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record))
  } catch {
    // storage unavailable; results stay for this page session only
  }
}
