import { store } from './mock'
import type { Conversion } from './mock'

export type { Base, Conversion } from './mock'

export const host = {
  listConversions: (): Conversion[] => store.list(),
  addConversion: (record: Omit<Conversion, 'id'>): Conversion => store.add(record),
  removeConversion: (id: string): boolean => store.remove(id),
  clearConversions: (): void => store.clear(),
}
