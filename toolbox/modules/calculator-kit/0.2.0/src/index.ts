// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/calculator-kit 0.2.0: snapshot of lacuna-components CalculatorKit at 5271c52 by sync-toolbox-components.py; a change gets a new version.
import type { JSX } from 'react'
import type { ChartProps } from '@lacuna/chart'
import type { RecordTableProps } from '@lacuna/record-table'
import { CalculatorKit } from './CalculatorKit'

export interface CalculatorKitInput {
  id: string
  label: string
  min?: number
  max?: number
  step?: number
  unit?: string
  defaultValue?: number
}

export interface CalculatorKitResult {
  /** Key-value pairs for the result summary. */
  summary: Array<{ label: string; value: string }>
  /** Rows for the breakdown table. */
  breakdown: Array<Record<string, string | number>>
  /** Optional chart data. */
  chart?: ChartProps
}

export interface CalculatorKitProps {
  /** Input fields for the calculator. */
  inputs: CalculatorKitInput[]
  /** Compute the result from current input values. */
  compute: (values: Record<string, number>) => CalculatorKitResult
  /** Optional label for the kit heading. */
  title?: string
  /** Forwarded to the internal RecordTable for the breakdown. */
  recordTableProps?: Omit<RecordTableProps<Record<string, string | number>>, 'columns' | 'records'>
  /** Forwarded to the internal Chart. */
  chartProps?: Omit<ChartProps, 'data'>
}

export { CalculatorKit }
