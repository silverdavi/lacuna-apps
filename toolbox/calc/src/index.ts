// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type {
  CalcResult,
  EvaluateOptions,
  GraphOptions,
  GraphResult,
  SamplePoint,
} from './types'
import { evalAst, parseAst, toCalcError, usesX } from './eval'

export type {
  AngleMode, CalcError, CalcErrorCode, CalcOk, CalcResult, EvaluateOptions,
  GraphOptions, GraphResult, SamplePoint,
} from './types'
export { isCalcError } from './types'

/**
 * Parse and evaluate a real expression. Never throws; returns a structured error.
 */
export function evaluate(
  expression: string,
  opts: EvaluateOptions = {},
): CalcResult<number> {
  const source = expression ?? ''
  try {
    const ast = parseAst(source)
    const value = evalAst(ast, opts, source)
    return { ok: true, value }
  } catch (e) {
    return toCalcError(e, source)
  }
}

/**
 * Sample y = f(x) over a domain. Parse errors return a structured error; per-sample
 * domain/divzero holes become discontinuities, not a throw.
 */
export function graph(
  expression: string,
  opts: GraphOptions = {},
): CalcResult<GraphResult> {
  const source = expression ?? ''
  const degrees = Boolean(opts.degrees)
  const xMin = opts.xMin ?? -10
  const xMax = opts.xMax ?? 10
  const samples = Math.max(2, Math.floor(opts.samples ?? 200))

  try {
    if (!(Number.isFinite(xMin) && Number.isFinite(xMax)) || xMax <= xMin) {
      return {
        ok: false,
        code: 'domain',
        message: 'Graph domain must be a finite interval with xMax > xMin',
        source,
      }
    }
    const ast = parseAst(source)
    if (!usesX(ast)) {
      // Constant: still produce a flat line so the UI can render something.
    }

    const points: SamplePoint[] = []
    const discontinuities: number[] = []
    const step = (xMax - xMin) / (samples - 1)
    let prevOk = false

    for (let i = 0; i < samples; i++) {
      const x = xMin + step * i
      try {
        const y = evalAst(ast, { degrees, vars: { x } }, source)
        if (!Number.isFinite(y)) {
          if (prevOk) discontinuities.push(x)
          prevOk = false
          continue
        }
        if (!prevOk && points.length > 0) discontinuities.push(x)
        points.push({ x, y })
        prevOk = true
      } catch {
        if (prevOk) discontinuities.push(x)
        prevOk = false
      }
    }

    return {
      ok: true,
      value: { points, discontinuities, xMin, xMax, degrees },
    }
  } catch (e) {
    return toCalcError(e, source)
  }
}
