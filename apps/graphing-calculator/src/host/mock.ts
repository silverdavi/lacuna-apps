// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type FunctionRecord = {
  id: string
  expression: string
  savedAt: number
}

export type GraphState = {
  functions: FunctionRecord[]
  xmin: string
  xmax: string
}

function isFunctionRecord(value: unknown): value is FunctionRecord {
  const v = value as Partial<FunctionRecord>
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    typeof v.expression === 'string' &&
    typeof v.savedAt === 'number'
  )
}

function isGraphState(value: unknown): value is GraphState {
  const v = value as Partial<GraphState>
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.xmin === 'string' &&
    typeof v.xmax === 'string' &&
    Array.isArray(v.functions) &&
    v.functions.every((f) => isFunctionRecord(f))
  )
}

const DEFAULT_STATE: GraphState = {
  functions: [],
  xmin: '-10',
  xmax: '9',
}

export const state = createMockValue<GraphState>({
  key: 'lacuna.graphing-calculator.state',
  fallback: DEFAULT_STATE,
  validate: isGraphState,
})

export const functions = createMockRecordStore<FunctionRecord>({
  key: 'lacuna.graphing-calculator.functions',
  validate: isFunctionRecord,
  idPrefix: 'fn',
})
