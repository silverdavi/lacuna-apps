// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
/** Angle mode for sin / cos / tan. */
export type AngleMode = 'rad' | 'deg'

export type CalcErrorCode =
  | 'empty'
  | 'syntax'
  | 'unknown'
  | 'arity'
  | 'divzero'
  | 'domain'

/** Structured failure from the public API. Never thrown past evaluate / graph. */
export interface CalcError {
  ok: false
  code: CalcErrorCode
  message: string
  /** Character index into the expression when known. */
  index?: number
  source: string
}

export interface CalcOk<T> {
  ok: true
  value: T
}

export type CalcResult<T> = CalcOk<T> | CalcError

export function isCalcError(r: CalcResult<unknown>): r is CalcError {
  return r.ok === false
}

export interface SamplePoint {
  x: number
  y: number
}

export interface GraphResult {
  /** Finite samples of y = f(x). */
  points: SamplePoint[]
  /** x values where the function is discontinuous or undefined between samples. */
  discontinuities: number[]
  xMin: number
  xMax: number
  degrees: boolean
}

export interface EvaluateOptions {
  /** When true, sin/cos/tan take degrees. Default false (radians). */
  degrees?: boolean
  /** Variable bindings; graphing binds `x` per sample. */
  vars?: Record<string, number>
}

export interface GraphOptions {
  degrees?: boolean
  xMin?: number
  xMax?: number
  /** Number of sample points across [xMin, xMax]. Default 200. */
  samples?: number
}
