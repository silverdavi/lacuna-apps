import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type Scenario = {
  id: string
  name: string
  homePrice: number
  downPayment: number
  rate: number
  term: number
  payment: number
  savedAt: number
}

export type MortgageInputs = {
  homePrice: string
  downPayment: string
  rate: string
  term: string
}

const DEFAULT_INPUTS: MortgageInputs = {
  homePrice: '300000',
  downPayment: '60000',
  rate: '6.5',
  term: '30',
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isScenario(value: unknown): value is Scenario {
  const v = value as Partial<Scenario>
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    isFiniteNumber(v.homePrice) &&
    isFiniteNumber(v.downPayment) &&
    isFiniteNumber(v.rate) &&
    isFiniteNumber(v.term) &&
    isFiniteNumber(v.payment)
  )
}

function isInputs(value: unknown): value is MortgageInputs {
  const v = value as Partial<MortgageInputs>
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.homePrice === 'string' &&
    typeof v.downPayment === 'string' &&
    typeof v.rate === 'string' &&
    typeof v.term === 'string'
  )
}

export const scenarios = createMockRecordStore<Scenario>({
  key: 'lacuna.mortgage-calculator.scenarios',
  validate: isScenario,
  idPrefix: 'scn',
})

export const inputs = createMockValue<MortgageInputs>({
  key: 'lacuna.mortgage-calculator.inputs',
  fallback: DEFAULT_INPUTS,
  validate: isInputs,
})
