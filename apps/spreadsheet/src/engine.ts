import { toCsv } from '@lacuna/csv-parse'
import type { SheetData } from './host'

export const ROWS = 4
export const COLS = 4
export const COL_NAMES = ['A', 'B', 'C', 'D']

export function cellLabel(col: number, row: number): string {
  return `${COL_NAMES[col]}${row + 1}`
}

export function isFormula(value: string): boolean {
  return value.startsWith('=')
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const m = /^([A-Z])(\d+)$/.exec(ref)
  if (!m) return null
  const col = COL_NAMES.indexOf(m[1])
  const row = parseInt(m[2], 10) - 1
  if (col < 0 || row < 0 || row >= ROWS || col >= COLS) return null
  return { col, row }
}

function isNumLike(s: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(s)
}

function isErr(s: string): boolean {
  return s.startsWith('#')
}

function applyOp(a: string, b: string, op: string): string {
  const x = Number(a)
  const y = Number(b)
  if (Number.isNaN(x) || Number.isNaN(y)) return '#ERR!'
  let r: number
  switch (op) {
    case '+': r = x + y; break
    case '-': r = x - y; break
    case '*': r = x * y; break
    case '/':
      if (y === 0) return '#DIV/0!'
      r = x / y
      break
    default: return '#ERR!'
  }
  return String(r)
}

function precedence(op: string): number {
  if (op === '*' || op === '/') return 2
  if (op === '+' || op === '-') return 1
  return 0
}

function evalShunting(input: string, resolveRef: (ref: string) => string): string {
  const tokenRe = /([A-Z]\d+|\d+(?:\.\d+)?)|[()+\-*/]/g
  const tokens: string[] = []
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(input)) !== null) {
    tokens.push(m[0])
  }
  if (tokens.length === 0) return '#ERR!'

  const out: string[] = []
  const ops: string[] = []

  for (const t of tokens) {
    if (/^[A-Z]\d+$/.test(t)) {
      out.push(resolveRef(t))
    } else if (isNumLike(t)) {
      out.push(t)
    } else if (t === '(') {
      ops.push(t)
    } else if (t === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        const op = ops.pop()
        if (op === undefined) return '#ERR!'
        out.push(op)
      }
      if (ops.length === 0) return '#ERR!'
      ops.pop()
    } else if ('+-*/'.includes(t)) {
      while (ops.length > 0 && ops[ops.length - 1] !== '(' && precedence(ops[ops.length - 1]) >= precedence(t)) {
        const op = ops.pop()
        if (op === undefined) return '#ERR!'
        out.push(op)
      }
      ops.push(t)
    } else {
      return '#NAME?'
    }
  }

  while (ops.length > 0) {
    const op = ops.pop()
    if (op === '(') return '#ERR!'
    if (op === undefined) return '#ERR!'
    out.push(op)
  }

  const stack: string[] = []
  for (const t of out) {
    if ('+-*/'.includes(t)) {
      if (stack.length < 2) return '#ERR!'
      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) return '#ERR!'
      if (isErr(a) || isErr(b)) {
        return '#ERR!'
      }
      const res = applyOp(a, b, t)
      stack.push(res)
    } else {
      stack.push(t)
    }
  }

  if (stack.length !== 1) return '#ERR!'
  const result = stack[0]
  if (result === undefined) return '#ERR!'
  return result
}

export function evaluate(value: string, cells: SheetData, visiting: Set<string> = new Set()): string {
  if (!isFormula(value)) return value
  const body = value.slice(1)

  const resolveRef = (ref: string): string => {
    const parsed = parseCellRef(ref)
    if (!parsed) return '#REF!'
    const key = `${parsed.col},${parsed.row}`
    if (visiting.has(key)) return '#CIRC!'
    const target = cells[key] ?? ''
    if (target === '') return '0'
    if (isFormula(target)) {
      return evaluate(target, cells, new Set([...visiting, key]))
    }
    if (isNumLike(target)) return target
    if (isErr(target)) return target
    return target
  }

  try {
    const result = evalShunting(body, resolveRef)
    return result
  } catch (e) {
    return '#ERR!'
  }
}

export function displayValue(value: string, cells: SheetData): string {
  if (!value || !isFormula(value)) return value
  try {
    return evaluate(value, cells)
  } catch {
    return '#ERR!'
  }
}

export function exportCsv(sheet: { cells: SheetData }): string {
  let lastRow = -1
  let lastCol = -1
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${c},${r}`
      if (sheet.cells[key] !== undefined && sheet.cells[key] !== '') {
        if (r > lastRow) lastRow = r
        if (c > lastCol) lastCol = c
      }
    }
  }
  if (lastRow < 0) return toCsv([COL_NAMES.slice(0, COLS)])
  const rows: string[][] = [COL_NAMES.slice(0, lastCol + 1)]
  for (let r = 0; r <= lastRow; r++) {
    const row: string[] = []
    for (let c = 0; c <= lastCol; c++) {
      const key = `${c},${r}`
      const raw = sheet.cells[key] ?? ''
      row.push(displayValue(raw, sheet.cells))
    }
    rows.push(row)
  }
  return toCsv(rows)
}
