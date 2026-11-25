// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.

export type RetirementInputs = {
  currentAge: string
  retirementAge: string
  currentSavings: string
  monthlyContribution: string
  annualReturn: string
}

export const DEFAULT_INPUTS: RetirementInputs = {
  currentAge: '30',
  retirementAge: '65',
  currentSavings: '50000',
  monthlyContribution: '500',
  annualReturn: '7',
}

export type YearRow = {
  year: number
  contribution: number
  growth: number
  balance: number
}

export type RetirementResult = {
  currentAge: number
  retirementAge: number
  years: number
  initialSavings: number
  monthlyContribution: number
  annualReturn: number
  projected: number
  totalContributions: number
  totalGrowth: number
  rows: YearRow[]
}

// The plan runs for `retirementAge - currentAge` years. Each year: growth is the
// opening balance times the annual return, the contribution is twelve times the
// monthly amount, and the balance is opening + contribution + growth, rounded to
// cents. The starting savings grow from year one.
export function calculateRetirement(inputs: RetirementInputs): { result: RetirementResult | null; error: string | null } {
  const currentAge = Number(inputs.currentAge)
  const retirementAge = Number(inputs.retirementAge)
  const initialSavings = Number(inputs.currentSavings)
  const monthlyContribution = Number(inputs.monthlyContribution)
  const annualReturn = Number(inputs.annualReturn)

  if (inputs.currentAge === '' || Number.isNaN(currentAge) || currentAge < 0) {
    return { result: null, error: 'Current age must be 0 or more' }
  }
  if (inputs.retirementAge === '' || Number.isNaN(retirementAge) || retirementAge <= currentAge) {
    return { result: null, error: 'Retirement age must be greater than current age' }
  }
  if (inputs.currentSavings === '' || Number.isNaN(initialSavings) || initialSavings < 0) {
    return { result: null, error: 'Current savings must be 0 or more' }
  }
  if (inputs.monthlyContribution === '' || Number.isNaN(monthlyContribution) || monthlyContribution < 0) {
    return { result: null, error: 'Monthly contribution must be 0 or more' }
  }
  if (inputs.annualReturn === '' || Number.isNaN(annualReturn) || annualReturn < 0 || annualReturn > 100) {
    return { result: null, error: 'Annual return must be between 0 and 100' }
  }

  const years = Math.round(retirementAge - currentAge)
  const totalContributions = initialSavings + monthlyContribution * 12 * years

  const rows: YearRow[] = []
  let running = initialSavings
  for (let y = 1; y <= years; y++) {
    const contribution = monthlyContribution * 12
    const growth = running * (annualReturn / 100)
    running = Math.round((running + contribution + growth) * 100) / 100
    rows.push({ year: y, contribution, growth, balance: running })
  }
  const projected = running
  const totalGrowth = projected - totalContributions

  return {
    result: {
      currentAge,
      retirementAge,
      years,
      initialSavings,
      monthlyContribution,
      annualReturn,
      projected,
      totalContributions,
      totalGrowth,
      rows,
    },
    error: null,
  }
}

export function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
