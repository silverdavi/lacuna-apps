// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import {
  addHistory,
  clearHistory,
  listHistory,
  removeHistory,
  type HistoryItem,
  type Operator,
} from './mock'

export type { HistoryItem, Operator }

export const host = {
  listHistory(): HistoryItem[] {
    return listHistory()
  },
  addHistory(expression: string, result: string): HistoryItem {
    return addHistory(expression, result)
  },
  removeHistory(id: string): void {
    removeHistory(id)
  },
  clearHistory(): void {
    clearHistory()
  },
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = a % b
    a = b
    b = t
  }
  return a === 0 ? 1 : a
}

export interface Fraction {
  n: number
  d: number
}

export function normalize(n: number, d: number): Fraction {
  if (d === 0) throw new Error('Denominator cannot be zero')
  if (d < 0) {
    n = -n
    d = -d
  }
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

export function add(a: Fraction, b: Fraction): Fraction {
  return normalize(a.n * b.d + b.n * a.d, a.d * b.d)
}

export function multiply(a: Fraction, b: Fraction): Fraction {
  return normalize(a.n * b.n, a.d * b.d)
}

export function divide(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new Error('Division by zero')
  return normalize(a.n * b.d, a.d * b.n)
}

export function toDecimal(a: Fraction): number {
  return a.n / a.d
}

export function formatFraction(a: Fraction): string {
  return `${a.n}/${a.d}`
}

export function expressionString(a: Fraction, op: Operator, b: Fraction): string {
  return `${formatFraction(a)} ${op} ${formatFraction(b)}`
}

export function compute(a: Fraction, op: Operator, b: Fraction): Fraction {
  if (op === '+') return add(a, b)
  if (op === '×') return multiply(a, b)
  return divide(a, b)
}
