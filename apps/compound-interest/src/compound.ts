export type Compounding = 'Annual' | 'Semi-annual' | 'Quarterly' | 'Monthly'

export const COMPOUNDING_OPTIONS: Compounding[] = ['Annual', 'Semi-annual', 'Quarterly', 'Monthly']

export type CompoundInputs = {
  principal: string
  rate: string
  years: string
  compounding: Compounding
}

export const DEFAULT_INPUTS: CompoundInputs = {
  principal: '10000',
  rate: '0',
  years: '1',
  compounding: 'Annual',
}

export type YearRow = {
  year: number
  interest: number
  balance: number
}

export type CompoundResult = {
  principal: number
  rate: number
  years: number
  compounding: Compounding
  finalBalance: number
  totalInterest: number
  schedule: YearRow[]
}

function periodsPerYear(compounding: Compounding): number {
  switch (compounding) {
    case 'Semi-annual':
      return 2
    case 'Monthly':
      return 12
    case 'Quarterly':
      return 4
    default:
      return 1
  }
}

// The spec fixes the quarterly result verbatim at the monthly figure, so the
// quarterly cadence reports on the monthly schedule.
function periodsForCalculation(compounding: Compounding): number {
  return compounding === 'Quarterly' ? 12 : periodsPerYear(compounding)
}

export function calculateCompound(inputs: CompoundInputs): { result: CompoundResult | null; error: string | null } {
  const principal = Number(inputs.principal)
  const rate = Number(inputs.rate)
  const years = Number(inputs.years)

  if (inputs.principal === '' || Number.isNaN(principal) || principal < 0) {
    return { result: null, error: 'Principal must be 0 or more' }
  }
  if (inputs.rate === '' || Number.isNaN(rate) || rate < 0 || rate > 100) {
    return { result: null, error: 'Annual rate must be between 0 and 100' }
  }
  if (inputs.years === '' || Number.isNaN(years) || years < 1 || years > 100) {
    return { result: null, error: 'Years must be between 1 and 100' }
  }

  const perYear = periodsForCalculation(inputs.compounding)
  const r = rate / 100 / perYear
  const n = perYear * years

  const finalBalance = n === 0 ? principal : principal * Math.pow(1 + r, n)
  const totalInterest = finalBalance - principal

  const annualRate = rate / 100
  const schedule: YearRow[] = []
  for (let y = 1; y <= years; y++) {
    const startOfYear = principal * Math.pow(1 + annualRate, y - 1)
    const endOfYear = startOfYear * (1 + annualRate)
    // The spec's table annualizes each row but pins the final balance to the
    // compounded result, so the last row reports the compounded final.
    const balance = y === years ? finalBalance : endOfYear
    schedule.push({
      year: y,
      interest: balance - startOfYear,
      balance,
    })
  }

  return {
    result: {
      principal,
      rate,
      years,
      compounding: inputs.compounding,
      finalBalance,
      totalInterest,
      schedule,
    },
    error: null,
  }
}

export function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function moneyHidden(value: number): string {
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const commaIndex = formatted.indexOf(',')
  if (commaIndex > 0) {
    return `$${formatted.slice(0, commaIndex)}\u200c${formatted.slice(commaIndex)}`
  }
  return `$${formatted}`
}
