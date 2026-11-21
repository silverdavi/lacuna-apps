import * as mock from './mock'
import type { Scenario } from './mock'
import type { CompoundInputs } from '../compound'

export type { CompoundInputs, Scenario }

export const host = {
  loadInputs: (): CompoundInputs => mock.inputs.get(),
  saveInputs: (value: CompoundInputs): void => mock.inputs.set(value),
  listScenarios: (): Scenario[] => mock.scenarios.list(),
  addScenario: (record: Omit<Scenario, 'id'>): Scenario => mock.scenarios.add(record),
  removeScenario: (id: string): boolean => mock.scenarios.remove(id),
}
