import * as mock from './mock'
import type { MortgageInputs, Scenario } from './mock'

export type { MortgageInputs, Scenario }

export const host = {
  loadInputs: (): MortgageInputs => mock.inputs.get(),
  saveInputs: (value: MortgageInputs): void => mock.inputs.set(value),
  listScenarios: (): Scenario[] => mock.scenarios.list(),
  addScenario: (record: Omit<Scenario, 'id'>): Scenario => mock.scenarios.add(record),
  removeScenario: (id: string): boolean => mock.scenarios.remove(id),
}
