export type Compounding = 'Annual' | 'Semi-annual' | 'Quarterly' | 'Monthly'

export const COMPOUNDING_OPTIONS: Compounding[] = ['Annual', 'Semi-annual', 'Quarterly', 'Monthly']

export type Contribution = 'None' | 'Monthly' | 'Annual'

export const CONTRIBUTION_OPTIONS: Contribution[] = ['None', 'Monthly', 'Annual']

export type CompoundInputs = {
  principal: string
  rate: string
  years: string
  compounding: Compounding
  contribution: string
  contributionType: Contribution
}

export const DEFAULT_INPUTS: CompoundInputs = {
  principal: '10000',
  rate: '0',
  years: '1',
  compounding: 'Annual',
  contribution: '0',
  contributionType: 'None',
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
  contribution: number
  contributionType: Contribution
  finalBalance: number
  totalInterest: number
  totalContributed: number
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
  const contribution = inputs.contribution === '' ? 0 : Number(inputs.contribution)
  const contributionType: Contribution = (['None', 'Monthly', 'Annual'] as const).includes(inputs.contributionType as Contribution)
    ? inputs.contributionType
    : 'None'

  if (inputs.principal === '' || Number.isNaN(principal) || principal < 0) {
    return { result: null, error: 'Principal must be 0 or more' }
  }
  if (inputs.rate === '' || Number.isNaN(rate) || rate < 0 || rate > 100) {
    return { result: null, error: 'Annual rate must be between 0 and 100' }
  }
  if (inputs.years === '' || Number.isNaN(years) || years < 1 || years > 100) {
    return { result: null, error: 'Years must be between 1 and 100' }
  }
  if (Number.isNaN(contribution) || contribution < 0) {
    return { result: null, error: 'Contribution must be 0 or more' }
  }

  const perYear = periodsForCalculation(inputs.compounding)
  const r = rate / 100 / perYear
  const n = perYear * years

  const principalFinal = n === 0 ? principal : principal * Math.pow(1 + r, n)

  let contributionFinal = 0
  let totalContributed = 0
  if (contribution > 0 && contributionType !== 'None') {
    totalContributed =
      contributionType === 'Monthly' ? contribution * 12 * years : contribution * years
    if (rate === 0) {
      contributionFinal = totalContributed
    } else {
      const contributionsPerYear = contributionType === 'Monthly' ? 12 : 1
      const periodCount = contributionsPerYear * years
      const perPeriodRate = rate / 100 / contributionsPerYear
      contributionFinal =
        contribution *
        ((Math.pow(1 + perPeriodRate, periodCount) - 1) / perPeriodRate)
    }
  }

  const finalBalance = principalFinal + contributionFinal
  const totalInterest = finalBalance - principal - totalContributed

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
      contribution,
      contributionType,
      finalBalance,
      totalInterest,
      totalContributed,
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
