// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Matrix arithmetic. Element-wise addition and multiplication follow the reference
// implementation (Abdul-Basit-Ansari/Matrix-Calculator, js/index.js, MIT); see NOTICE.md.

import type { MatrixRecord, Operation } from './host'

export const DEFAULT_A: MatrixRecord = { rows: 2, cols: 2, values: ['1', '2', '3', '4'] }
export const DEFAULT_B: MatrixRecord = { rows: 2, cols: 2, values: ['5', '6', '7', '8'] }

export function cellName(rows: number, cols: number, index: number): string {
  const row = Math.floor(index / cols)
  const col = index % cols
  return `${String.fromCharCode(65 + row)}${row + 1}${col + 1}`
}

export function cellIndex(rows: number, cols: number, name: string): number {
  const row = name.charCodeAt(0) - 65
  const digits = name.slice(1)
  // The name is `<rowLetter><rowNumber><colNumber>` where rowNumber and colNumber are
  // each at least one digit. Find the unique split of `digits` into rowNumber and
  // colNumber that are both within the matrix's dimensions.
  for (let i = 1; i < digits.length; i += 1) {
    const rowNumber = Number(digits.slice(0, i)) - 1
    const colNumber = Number(digits.slice(i)) - 1
    if (rowNumber >= 0 && rowNumber < rows && colNumber >= 0 && colNumber < cols) {
      return rowNumber * cols + colNumber
    }
  }
  return -1
}

export function resize(_matrix: MatrixRecord, rows: number, cols: number): MatrixRecord {
  const values = new Array<string>(rows * cols).fill('0')
  return { rows, cols, values }
}

function parse(value: string): number | null {
  const text = value.trim()
  if (text === '') return 0
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

function format(n: number): string {
  return String(Number(n.toFixed(6)))
}

export type ComputedResult = { kind: 'ok'; values: string[] } | { kind: 'error'; message: string }

export function compute(a: MatrixRecord, b: MatrixRecord, operation: Operation): ComputedResult {
  if (operation === 'multiply' && (a.rows !== b.cols || b.rows !== a.cols)) {
    return { kind: 'error', message: 'Dimensions do not match for multiplication' }
  }
  const values = new Array<string>(a.rows * a.cols)
  for (let r = 0; r < a.rows; r += 1) {
    for (let c = 0; c < a.cols; c += 1) {
      let out: number | null = null
      if (operation === 'add') {
        if (a.rows === b.rows && a.cols === b.cols) {
          const x = parse(a.values[r * a.cols + c])
          const y = parse(b.values[r * b.cols + c])
          out = x === null || y === null ? null : x + y
        }
      } else {
        let sum = 0
        let broken = false
        for (let k = 0; k < a.cols; k += 1) {
          const x = parse(a.values[r * a.cols + k])
          const y = parse(b.values[k * b.cols + c])
          if (x === null || y === null) {
            broken = true
            break
          }
          sum += x * y
        }
        out = broken ? null : sum
      }
      values[r * a.cols + c] = out === null ? '–' : format(out)
    }
  }
  return { kind: 'ok', values }
}
