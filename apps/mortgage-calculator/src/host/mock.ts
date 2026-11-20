export interface MortgageInputs {
  loanAmount: string
  interestRate: string
  termYears: string
  downPayment: string
}

export interface MortgageResult {
  loanAmount: number
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  years: number
  rows: { year: number; principalPaid: number; interestPaid: number; remainingBalance: number }[]
}

export interface MortgageState {
  inputs: MortgageInputs
  result: MortgageResult
}

export interface Host {
  loadState(): MortgageState | null
  saveState(state: MortgageState): void
}

const KEY = 'lacuna.mortgage-calculator.state'
const DEFAULT_INPUTS: MortgageInputs = {
  loanAmount: '300000',
  interestRate: '6.5',
  termYears: '30',
  downPayment: '60000',
}

function isInputs(value: unknown): value is MortgageInputs {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return ['loanAmount', 'interestRate', 'termYears', 'downPayment'].every(
    (k) => typeof v[k] === 'string',
  )
}

export const mockHost: Host = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<MortgageState>
      if (!isInputs(parsed.inputs) || typeof parsed.result !== 'object' || parsed.result === null) {
        return null
      }
      return { inputs: parsed.inputs, result: parsed.result as MortgageResult }
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
