// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import * as mock from './mock'
import type { FunctionRecord, GraphState } from './mock'

export type { FunctionRecord, GraphState }

export const host = {
  loadState: (): GraphState => mock.state.get(),
  saveState: (value: GraphState): void => mock.state.set(value),
  listFunctions: (): FunctionRecord[] => mock.functions.list(),
  addFunction: (record: Omit<FunctionRecord, 'id'>): FunctionRecord => mock.functions.add(record),
  removeFunction: (id: string): boolean => mock.functions.remove(id),
}
