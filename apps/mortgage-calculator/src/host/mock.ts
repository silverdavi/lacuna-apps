export interface MortgageInputs {
  homePrice: string
  downPayment: string
  interestRate: string
  termYears: string
}

export interface MortgageResult {
  loanAmount: number
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  years: number
  rows: { year: number; principalPaid: number; interestPaid: number; remainingBalance: number }[]
}

export interface SavedScenario {
  inputs: MortgageInputs
  result: MortgageResult
}

export interface MortgageState {
  inputs: MortgageInputs
  result: MortgageResult
  scenarios: SavedScenario[]
}

export interface Host {
  loadState(): MortgageState | null
  saveState(state: MortgageState): void
}

const KEY = 'lacuna.mortgage-calculator.state'
const DEFAULT_INPUTS: MortgageInputs = {
  homePrice: '300000',
  downPayment: '60000',
  interestRate: '6.5',
  termYears: '30',
}

function isInputs(value: unknown): value is MortgageInputs {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return ['homePrice', 'downPayment', 'interestRate', 'termYears'].every(
    (k) => typeof v[k] === 'string',
  )
}

function isResult(value: unknown): value is MortgageResult {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.loanAmount === 'number' &&
    typeof v.monthlyPayment === 'number' &&
    typeof v.totalInterest === 'number' &&
    typeof v.years === 'number' &&
    Array.isArray(v.rows)
  )
}

function isScenario(value: unknown): value is SavedScenario {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return isInputs(v.inputs) && isResult(v.result)
}

export const mockHost: Host = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<MortgageState>
      if (!isInputs(parsed.inputs) || !isResult(parsed.result)) {
        return null
      }
      const scenarios = Array.isArray(parsed.scenarios)
        ? parsed.scenarios.filter(isScenario)
        : []
      return { inputs: parsed.inputs, result: parsed.result, scenarios }
    } catch {
      return null
    }
  },
  saveState(state: MortgageState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; state stays in memory only
    }
  },
}

export const defaultInputs: MortgageInputs = DEFAULT_INPUTS
