// Pure grade math and validation. No React, no DOM, no storage.

export type Component = {
  id: string
  name: string
  score: number // 0..100
  weight: number // percentage, may be any non-negative number
}

export type GradeState = {
  components: Component[]
}

/** Format a number to two decimals, e.g. 91.25 or 100.00. */
export const fmt2 = (n: number): string => n.toFixed(2)

/**
 * Format a weight for display. Weights that land on a whole percent render as
 * "40%" (the form of value the user typed); anything with a fractional part
 * renders with two decimals, e.g. "12.50%".
 */
export const fmtPct = (n: number): string => (Number.isInteger(n) ? `${n}%` : `${fmt2(n)}%`)

/** Sum of every component's weight. */
export const sumWeights = (state: GradeState): number =>
  state.components.reduce((acc, c) => acc + c.weight, 0)

/** Final grade: each score contributes score * weight / 100, summed. */
export const weightedTotal = (state: GradeState): number =>
  state.components.reduce((acc, c) => acc + (c.score * c.weight) / 100, 0)

export type FieldError =
  | { ok: false; message: string }
  | { ok: true; name: string; score: number }

/**
 * Validate the add-component form.
 * A missing or blank name, a score that does not parse, or a score outside
 * 0..100 are rejected. The weight is free-form here.
 */
export function validateComponent(name: string, score: string, weight: string): FieldError {
  const trimmedName = name.trim()
  if (trimmedName === '') {
    return { ok: false, message: 'Enter a name and a score between 0 and 100' }
  }
  const trimmedScore = score.trim()
  if (trimmedScore === '') {
    return { ok: false, message: 'Enter a name and a score between 0 and 100' }
  }
  const parsed = Number(trimmedScore)
  if (Number.isNaN(parsed)) {
    return { ok: false, message: 'Score must be a number' }
  }
  if (parsed < 0 || parsed > 100) {
    return { ok: false, message: 'Enter a name and a score between 0 and 100' }
  }
  return { ok: true, name: trimmedName, score: parsed }
}

/** Short warning for when the weights do not total 100%. */
export function weightsWarning(state: GradeState): string | null {
  const total = sumWeights(state)
  if (total === 100) return null
  return `Weights sum to ${Number.isInteger(total) ? `${total}%` : `${fmt2(total)}%`}`
}
