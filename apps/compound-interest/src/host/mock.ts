import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'
import { DEFAULT_INPUTS, type CompoundInputs } from '../compound'

export type Scenario = {
  id: string
  name: string
  principal: number
  rate: number
  years: number
  compounding: string
  contribution: number
  contributionType: string
  finalBalance: number
  totalInterest: number
  totalContributed: number
  savedAt: number
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
    isFiniteNumber(v.principal) &&
    isFiniteNumber(v.rate) &&
    isFiniteNumber(v.years) &&
    typeof v.compounding === 'string' &&
    isFiniteNumber(v.contribution) &&
    typeof v.contributionType === 'string' &&
    isFiniteNumber(v.finalBalance) &&
    isFiniteNumber(v.totalInterest) &&
    isFiniteNumber(v.totalContributed)
  )
}

function isInputs(value: unknown): value is CompoundInputs {
  const v = value as Partial<CompoundInputs>
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.principal === 'string' &&
    typeof v.rate === 'string' &&
    typeof v.years === 'string' &&
    typeof v.compounding === 'string' &&
    typeof v.contribution === 'string' &&
    typeof v.contributionType === 'string'
  )
}

export const scenarios = createMockRecordStore<Scenario>({
  key: 'lacuna.compound-interest.scenarios',
  validate: isScenario,
  idPrefix: 'scn',
})

export const inputs = createMockValue<CompoundInputs>({
  key: 'lacuna.compound-interest.inputs',
  fallback: DEFAULT_INPUTS,
  validate: isInputs,
})
