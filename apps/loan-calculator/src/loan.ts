export interface LoanInput {
  principal: string
  rate: string
  years: string
}

export type LoanFieldError =
  | 'Enter a valid number'
  | 'Principal must be between 1 and 100,000,000'
  | 'Rate must be between 0 and 100'
  | 'Years must be between 1 and 50'

export interface LoanRow {
  payment: number
  principalPart: number
  interest: number
  balance: number
}

export interface LoanResult {
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  rows: LoanRow[]
}

export interface SavedLoan {
  id: string
  principal: string
  rate: string
  years: string
  monthlyPayment: number
  savedAt: number
}

export function principalError(value: string): LoanFieldError | null {
  const v = value.trim()
  if (v === '') return null
  const n = Number.parseFloat(v)
  if (!Number.isFinite(n)) return 'Enter a valid number'
  if (n < 1 || n > 100000000) return 'Principal must be between 1 and 100,000,000'
  return null
}

export function rateError(value: string): LoanFieldError | null {
  const v = value.trim()
  if (v === '') return null
  const n = Number.parseFloat(v)
  if (!Number.isFinite(n)) return 'Enter a valid number'
  if (n < 0 || n > 100) return 'Rate must be between 0 and 100'
  return null
}

export function yearsError(value: string): LoanFieldError | null {
  const v = value.trim()
  if (v === '') return null
  const n = Number.parseFloat(v)
  if (!Number.isFinite(n)) return 'Enter a valid number'
  if (n < 1 || n > 50) return 'Years must be between 1 and 50'
  return null
}

function paymentFor(principal: number, monthlyRate: number, n: number): number {
  if (monthlyRate === 0) return principal / n
  const x = (1 + monthlyRate) ** n
  return (principal * monthlyRate * x) / (x - 1)
}

export function calculateLoan(input: LoanInput): LoanResult | null {
  const p = Number.parseFloat(input.principal)
  const r = Number.parseFloat(input.rate)
  const y = Number.parseFloat(input.years)
  if (
    !Number.isFinite(p) ||
    !Number.isFinite(r) ||
    !Number.isFinite(y) ||
    p < 1 ||
    r < 0 ||
    y < 1
  ) {
    return null
  }
  if (p > 100000000 || r > 100 || y > 50) return null
  const n = Math.round(y * 12)
  const i = r / 100 / 12
  const monthly = paymentFor(p, i, n)
  const totalPaid = monthly * n
  const totalInterest = totalPaid - p
  const rows: LoanRow[] = []
  let balance = p
  for (let k = 0; k < n; k++) {
    const interest = balance * i
    let principalPart = monthly - interest
    if (k === n - 1) principalPart = balance
    balance -= principalPart
    if (balance < 0) balance = 0
    rows.push({
      payment: k === n - 1 ? principalPart + interest : monthly,
      principalPart,
      interest,
      balance,
    })
  }
  return { monthlyPayment: monthly, totalInterest, totalPaid, rows }
}

export function formatMoney(value: number): string {
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
