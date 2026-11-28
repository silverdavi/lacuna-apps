// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Pure recursive-descent spreadsheet formula engine.
import { coordToKey, parseCellKey, type NumberFormat, type SheetData, type Workbook } from './model'

export type CellValue =
  | { kind: 'empty' }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'error'; code: FormulaErrorCode }

export type FormulaErrorCode =
  | '#DIV/0!'
  | '#VALUE!'
  | '#REF!'
  | '#NAME?'
  | '#N/A'
  | '#CYCLE!'
  | '#ERR!'

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }
  | { type: 'colon' }
  | { type: 'bang' }

const CELL_RE = /^\$?[A-Za-z]+\$?\d+$/

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }
    if (ch === '"') {
      let s = ''
      i++
      while (i < expr.length) {
        if (expr[i] === '"') {
          if (expr[i + 1] === '"') {
            s += '"'
            i += 2
            continue
          }
          i++
          break
        }
        s += expr[i]
        i++
      }
      tokens.push({ type: 'string', value: s })
      continue
    }
    if (ch === "'") {
      // Quoted sheet name e.g. 'Q1 Sales'!A1
      let s = ''
      i++
      while (i < expr.length && expr[i] !== "'") {
        s += expr[i]
        i++
      }
      if (expr[i] === "'") i++
      tokens.push({ type: 'ident', value: s })
      continue
    }
    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < expr.length && expr[i + 1] >= '0' && expr[i + 1] <= '9')) {
      let num = ''
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
        num += expr[i++]
      }
      if (i < expr.length && (expr[i] === 'e' || expr[i] === 'E')) {
        num += expr[i++]
        if (i < expr.length && (expr[i] === '+' || expr[i] === '-')) num += expr[i++]
        while (i < expr.length && expr[i] >= '0' && expr[i] <= '9') num += expr[i++]
      }
      const n = Number(num)
      tokens.push({ type: 'number', value: Number.isFinite(n) ? n : NaN })
      continue
    }
    if (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      ch === '_' ||
      ch === '$'
    ) {
      let id = ''
      while (
        i < expr.length &&
        ((expr[i] >= 'A' && expr[i] <= 'Z') ||
          (expr[i] >= 'a' && expr[i] <= 'z') ||
          (expr[i] >= '0' && expr[i] <= '9') ||
          expr[i] === '_' ||
          expr[i] === '$' ||
          expr[i] === '.')
      ) {
        id += expr[i++]
      }
      tokens.push({ type: 'ident', value: id })
      continue
    }
    const two = expr.slice(i, i + 2)
    if (two === '<>' || two === '<=' || two === '>=') {
      tokens.push({ type: 'op', value: two })
      i += 2
      continue
    }
    if ('+-*/^&=<>%'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' })
      i++
      continue
    }
    if (ch === ':') {
      tokens.push({ type: 'colon' })
      i++
      continue
    }
    if (ch === '!') {
      tokens.push({ type: 'bang' })
      i++
      continue
    }
    throw new FormulaError('#ERR!')
  }
  return tokens
}

class FormulaError extends Error {
  code: FormulaErrorCode
  constructor(code: FormulaErrorCode) {
    super(code)
    this.code = code
  }
}

type EvalResult = CellValue | { kind: 'matrix'; rows: CellValue[][] }

function toNumber(v: CellValue): number {
  if (v.kind === 'error') throw new FormulaError(v.code)
  if (v.kind === 'number') return v.value
  if (v.kind === 'boolean') return v.value ? 1 : 0
  if (v.kind === 'empty') return 0
  const n = Number(v.value.trim())
  if (v.value.trim() !== '' && Number.isFinite(n)) return n
  throw new FormulaError('#VALUE!')
}

function toStringVal(v: CellValue): string {
  if (v.kind === 'error') throw new FormulaError(v.code)
  if (v.kind === 'empty') return ''
  if (v.kind === 'boolean') return v.value ? 'TRUE' : 'FALSE'
  return String(v.value)
}

function toBool(v: CellValue): boolean {
  if (v.kind === 'error') throw new FormulaError(v.code)
  if (v.kind === 'boolean') return v.value
  if (v.kind === 'number') return v.value !== 0
  if (v.kind === 'empty') return false
  const up = v.value.trim().toUpperCase()
  if (up === 'TRUE') return true
  if (up === 'FALSE' || up === '') return false
  throw new FormulaError('#VALUE!')
}

function flattenArgs(args: EvalResult[]): CellValue[] {
  const out: CellValue[] = []
  for (const a of args) {
    if (a.kind === 'matrix') {
      for (const row of a.rows) for (const cell of row) out.push(cell)
    } else {
      out.push(a)
    }
  }
  return out
}

function scalar(a: EvalResult | undefined): CellValue {
  if (!a) return { kind: 'empty' }
  if (a.kind === 'matrix') return a.rows[0]?.[0] ?? { kind: 'empty' }
  return a
}

function compareValues(a: CellValue, b: CellValue): number {
  if (a.kind === 'error') throw new FormulaError(a.code)
  if (b.kind === 'error') throw new FormulaError(b.code)
  if (a.kind === 'number' && b.kind === 'number') return a.value - b.value
  if (a.kind === 'empty' && b.kind === 'number') return 0 - b.value
  if (a.kind === 'number' && b.kind === 'empty') return a.value - 0
  if (a.kind === 'boolean' && b.kind === 'boolean') return Number(a.value) - Number(b.value)
  const sa = toStringVal(a).toLowerCase()
  const sb = toStringVal(b).toLowerCase()
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

function matchesCriteria(cell: CellValue, criteria: CellValue): boolean {
  if (criteria.kind === 'string') {
    const s = criteria.value.trim()
    const opMatch = /^(>=|<=|<>|>|<|=)(.*)$/.exec(s)
    if (opMatch) {
      const op = opMatch[1]
      const rhsRaw = opMatch[2].trim()
      const rhsNum = Number(rhsRaw)
      const rhs: CellValue =
        rhsRaw !== '' && Number.isFinite(rhsNum)
          ? { kind: 'number', value: rhsNum }
          : { kind: 'string', value: rhsRaw }
      const cmp = compareValues(cell, rhs)
      if (op === '=') return cmp === 0
      if (op === '<>') return cmp !== 0
      if (op === '>') return cmp > 0
      if (op === '>=') return cmp >= 0
      if (op === '<') return cmp < 0
      if (op === '<=') return cmp <= 0
    }
  }
  return compareValues(cell, criteria) === 0
}

function extractNumbers(args: EvalResult[]): number[] {
  const nums: number[] = []
  for (const a of args) {
    if (a.kind === 'matrix') {
      for (const row of a.rows) {
        for (const c of row) {
          if (c.kind === 'error') throw new FormulaError(c.code)
          if (c.kind === 'number') nums.push(c.value)
        }
      }
    } else {
      if (a.kind === 'error') throw new FormulaError(a.code)
      if (a.kind === 'number') nums.push(a.value)
      else if (a.kind === 'boolean') nums.push(a.value ? 1 : 0)
      else if (a.kind === 'string' && a.value.trim() !== '') {
        const n = Number(a.value.trim())
        if (Number.isFinite(n)) nums.push(n)
      }
    }
  }
  return nums
}

function callFunction(name: string, args: EvalResult[]): CellValue {
  const fn = name.toUpperCase()

  switch (fn) {
    case 'SUM': {
      const nums = extractNumbers(args)
      return { kind: 'number', value: nums.reduce((a, b) => a + b, 0) }
    }
    case 'AVERAGE':
    case 'AVG': {
      const nums = extractNumbers(args)
      if (nums.length === 0) throw new FormulaError('#DIV/0!')
      return { kind: 'number', value: nums.reduce((a, b) => a + b, 0) / nums.length }
    }
    case 'MIN': {
      const nums = extractNumbers(args)
      return { kind: 'number', value: nums.length ? Math.min(...nums) : 0 }
    }
    case 'MAX': {
      const nums = extractNumbers(args)
      return { kind: 'number', value: nums.length ? Math.max(...nums) : 0 }
    }
    case 'COUNT': {
      const flat = flattenArgs(args)
      return { kind: 'number', value: flat.filter((v) => v.kind === 'number').length }
    }
    case 'COUNTA': {
      const flat = flattenArgs(args)
      return {
        kind: 'number',
        value: flat.filter((v) => v.kind !== 'empty' && !(v.kind === 'string' && v.value === '')).length,
      }
    }
    case 'COUNTIF': {
      if (args.length < 2) throw new FormulaError('#VALUE!')
      const range = flattenArgs([args[0]])
      const crit = scalar(args[1])
      return { kind: 'number', value: range.filter((c) => matchesCriteria(c, crit)).length }
    }
    case 'SUMIF': {
      if (args.length < 2) throw new FormulaError('#VALUE!')
      const range = flattenArgs([args[0]])
      const crit = scalar(args[1])
      const sumRange = args[2] ? flattenArgs([args[2]]) : range
      let total = 0
      for (let i = 0; i < range.length; i++) {
        if (matchesCriteria(range[i], crit)) {
          const target = sumRange[i]
          if (target && target.kind === 'number') total += target.value
        }
      }
      return { kind: 'number', value: total }
    }
    case 'MEDIAN': {
      const nums = extractNumbers(args).sort((a, b) => a - b)
      if (nums.length === 0) throw new FormulaError('#VALUE!')
      const mid = Math.floor(nums.length / 2)
      return {
        kind: 'number',
        value: nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2,
      }
    }
    case 'STDEV': {
      const nums = extractNumbers(args)
      if (nums.length < 2) throw new FormulaError('#DIV/0!')
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length
      const variance = nums.reduce((s, x) => s + (x - mean) ** 2, 0) / (nums.length - 1)
      return { kind: 'number', value: Math.sqrt(variance) }
    }
    case 'ROUND': {
      const val = toNumber(scalar(args[0]))
      const digits = args[1] ? Math.trunc(toNumber(scalar(args[1]))) : 0
      const factor = 10 ** digits
      return { kind: 'number', value: Math.round(val * factor) / factor }
    }
    case 'FLOOR':
      return { kind: 'number', value: Math.floor(toNumber(scalar(args[0]))) }
    case 'CEIL':
    case 'CEILING':
      return { kind: 'number', value: Math.ceil(toNumber(scalar(args[0]))) }
    case 'INT':
      return { kind: 'number', value: Math.floor(toNumber(scalar(args[0]))) }
    case 'ABS':
      return { kind: 'number', value: Math.abs(toNumber(scalar(args[0]))) }
    case 'SQRT': {
      const v = toNumber(scalar(args[0]))
      if (v < 0) throw new FormulaError('#VALUE!')
      return { kind: 'number', value: Math.sqrt(v) }
    }
    case 'POWER':
      return { kind: 'number', value: toNumber(scalar(args[0])) ** toNumber(scalar(args[1])) }
    case 'MOD': {
      const a = toNumber(scalar(args[0]))
      const b = toNumber(scalar(args[1]))
      if (b === 0) throw new FormulaError('#DIV/0!')
      return { kind: 'number', value: ((a % b) + b) % b }
    }
    case 'PI':
      return { kind: 'number', value: Math.PI }
    case 'IF': {
      const cond = toBool(scalar(args[0]))
      return cond ? scalar(args[1]) : args[2] ? scalar(args[2]) : { kind: 'boolean', value: false }
    }
    case 'AND': {
      const flat = flattenArgs(args)
      if (flat.length === 0) throw new FormulaError('#VALUE!')
      return { kind: 'boolean', value: flat.every((v) => toBool(v)) }
    }
    case 'OR': {
      const flat = flattenArgs(args)
      if (flat.length === 0) throw new FormulaError('#VALUE!')
      return { kind: 'boolean', value: flat.some((v) => toBool(v)) }
    }
    case 'NOT':
      return { kind: 'boolean', value: !toBool(scalar(args[0])) }
    case 'IFERROR': {
      const first = scalar(args[0])
      if (first.kind === 'error') return scalar(args[1])
      return first
    }
    case 'ISBLANK':
      return { kind: 'boolean', value: scalar(args[0]).kind === 'empty' }
    case 'ISNUMBER':
      return { kind: 'boolean', value: scalar(args[0]).kind === 'number' }
    case 'VLOOKUP': {
      if (args.length < 3) throw new FormulaError('#VALUE!')
      const key = scalar(args[0])
      const table = args[1]
      if (table.kind !== 'matrix') throw new FormulaError('#VALUE!')
      const colIndex = Math.trunc(toNumber(scalar(args[2]))) - 1
      if (colIndex < 0) throw new FormulaError('#VALUE!')
      for (const row of table.rows) {
        if (row[0] && compareValues(row[0], key) === 0) {
          if (colIndex >= row.length) throw new FormulaError('#REF!')
          return row[colIndex]
        }
      }
      throw new FormulaError('#N/A')
    }
    case 'INDEX': {
      if (args.length < 2) throw new FormulaError('#VALUE!')
      const table = args[0]
      if (table.kind !== 'matrix') throw new FormulaError('#VALUE!')
      const r = Math.trunc(toNumber(scalar(args[1]))) - 1
      const c = args[2] ? Math.trunc(toNumber(scalar(args[2]))) - 1 : 0
      const row = table.rows[r]
      if (!row || c < 0 || c >= row.length) throw new FormulaError('#REF!')
      return row[c]
    }
    case 'MATCH': {
      if (args.length < 2) throw new FormulaError('#VALUE!')
      const needle = scalar(args[0])
      const list = flattenArgs([args[1]])
      const idx = list.findIndex((v) => compareValues(v, needle) === 0)
      if (idx < 0) throw new FormulaError('#N/A')
      return { kind: 'number', value: idx + 1 }
    }
    case 'CHOOSE': {
      const idx = Math.trunc(toNumber(scalar(args[0])))
      if (idx < 1 || idx >= args.length) throw new FormulaError('#VALUE!')
      return scalar(args[idx])
    }
    case 'CONCAT':
    case 'CONCATENATE': {
      const flat = flattenArgs(args)
      return { kind: 'string', value: flat.map((v) => toStringVal(v)).join('') }
    }
    case 'LEN':
      return { kind: 'number', value: toStringVal(scalar(args[0])).length }
    case 'UPPER':
      return { kind: 'string', value: toStringVal(scalar(args[0])).toUpperCase() }
    case 'LOWER':
      return { kind: 'string', value: toStringVal(scalar(args[0])).toLowerCase() }
    case 'TRIM':
      return { kind: 'string', value: toStringVal(scalar(args[0])).trim().replace(/\s+/g, ' ') }
    case 'LEFT': {
      const s = toStringVal(scalar(args[0]))
      const n = args[1] ? Math.max(0, Math.trunc(toNumber(scalar(args[1])))) : 1
      return { kind: 'string', value: s.slice(0, n) }
    }
    case 'RIGHT': {
      const s = toStringVal(scalar(args[0]))
      const n = args[1] ? Math.max(0, Math.trunc(toNumber(scalar(args[1])))) : 1
      return { kind: 'string', value: n === 0 ? '' : s.slice(-n) }
    }
    case 'MID': {
      const s = toStringVal(scalar(args[0]))
      const start = Math.max(1, Math.trunc(toNumber(scalar(args[1])))) - 1
      const len = Math.max(0, Math.trunc(toNumber(scalar(args[2]))))
      return { kind: 'string', value: s.slice(start, start + len) }
    }
    case 'PMT': {
      const rate = toNumber(scalar(args[0]))
      const nper = toNumber(scalar(args[1]))
      const pv = toNumber(scalar(args[2]))
      if (nper === 0) throw new FormulaError('#DIV/0!')
      if (rate === 0) return { kind: 'number', value: -pv / nper }
      const pvif = (1 + rate) ** nper
      return { kind: 'number', value: -(rate * pv * pvif) / (pvif - 1) }
    }
    case 'FV': {
      const rate = toNumber(scalar(args[0]))
      const nper = toNumber(scalar(args[1]))
      const pmt = toNumber(scalar(args[2]))
      const pv = args[3] ? toNumber(scalar(args[3])) : 0
      if (rate === 0) return { kind: 'number', value: -(pv + pmt * nper) }
      const factor = (1 + rate) ** nper
      return { kind: 'number', value: -(pv * factor + (pmt * (factor - 1)) / rate) }
    }
    case 'PV': {
      const rate = toNumber(scalar(args[0]))
      const nper = toNumber(scalar(args[1]))
      const pmt = toNumber(scalar(args[2]))
      if (rate === 0) return { kind: 'number', value: -pmt * nper }
      const factor = (1 + rate) ** nper
      return { kind: 'number', value: -(pmt * (factor - 1)) / (rate * factor) }
    }
    case 'NPV': {
      const rate = toNumber(scalar(args[0]))
      const flows = extractNumbers(args.slice(1))
      const total = flows.reduce((acc, cf, idx) => acc + cf / (1 + rate) ** (idx + 1), 0)
      return { kind: 'number', value: total }
    }
    default:
      throw new FormulaError('#NAME?')
  }
}

export type EvaluatedWorkbook = Map<string, Map<string, CellValue>>

export function evaluateWorkbook(wb: Workbook): EvaluatedWorkbook {
  const sheetById = new Map<string, SheetData>()
  const sheetByName = new Map<string, SheetData>()
  for (const s of wb.sheets) {
    sheetById.set(s.id, s)
    sheetByName.set(s.name.toLowerCase(), s)
  }

  const cache: EvaluatedWorkbook = new Map()
  for (const s of wb.sheets) cache.set(s.id, new Map())
  const visiting = new Set<string>()

  function evalCell(sheetId: string, key: string): CellValue {
    const cleanKey = key.replace(/\$/g, '').toUpperCase()
    const sheetCache = cache.get(sheetId)
    if (!sheetCache) return { kind: 'error', code: '#REF!' }
    const hit = sheetCache.get(cleanKey)
    if (hit) return hit

    const visitId = `${sheetId}!${cleanKey}`
    if (visiting.has(visitId)) return { kind: 'error', code: '#CYCLE!' }
    visiting.add(visitId)

    const sheet = sheetById.get(sheetId)
    const raw = sheet?.cells[cleanKey]?.raw ?? ''
    let result: CellValue

    if (raw === '') {
      result = { kind: 'empty' }
    } else if (raw.startsWith('=')) {
      result = evalFormula(sheetId, raw.slice(1))
    } else {
      const trimmed = raw.trim()
      if (trimmed.toUpperCase() === 'TRUE') {
        result = { kind: 'boolean', value: true }
      } else if (trimmed.toUpperCase() === 'FALSE') {
        result = { kind: 'boolean', value: false }
      } else if (/^-?\$?\d[\d,]*(?:\.\d+)?%?$/.test(trimmed)) {
        const isPct = trimmed.endsWith('%')
        const cleaned = trimmed.replace(/[$,%]/g, '')
        const num = Number(cleaned)
        result = Number.isFinite(num)
          ? { kind: 'number', value: isPct ? num / 100 : num }
          : { kind: 'string', value: raw }
      } else {
        result = { kind: 'string', value: raw }
      }
    }

    visiting.delete(visitId)
    sheetCache.set(cleanKey, result)
    return result
  }

  function evalRange(sheetId: string, startKey: string, endKey: string): EvalResult {
    const a = parseCellKey(startKey)
    const b = parseCellKey(endKey)
    if (!a || !b) throw new FormulaError('#REF!')
    const r1 = Math.min(a.row, b.row)
    const r2 = Math.max(a.row, b.row)
    const c1 = Math.min(a.col, b.col)
    const c2 = Math.max(a.col, b.col)
    const rows: CellValue[][] = []
    for (let r = r1; r <= r2; r++) {
      const rowVals: CellValue[] = []
      for (let c = c1; c <= c2; c++) {
        rowVals.push(evalCell(sheetId, coordToKey(r, c)))
      }
      rows.push(rowVals)
    }
    return { kind: 'matrix', rows }
  }

  function evalFormula(currentSheetId: string, expr: string): CellValue {
    try {
      const tokens = tokenize(expr)
      if (tokens.length === 0) return { kind: 'empty' }
      let pos = 0

      const peek = () => tokens[pos]
      const consume = () => tokens[pos++]

      function parseComparison(): EvalResult {
        let left = parseConcat()
        while (peek()?.type === 'op' && ['=', '<>', '<', '<=', '>', '>='].includes((peek() as { type: 'op'; value: string }).value)) {
          const op = (consume() as { type: 'op'; value: string }).value
          const right = parseConcat()
          const cmp = compareValues(scalar(left), scalar(right))
          let ok = false
          if (op === '=') ok = cmp === 0
          else if (op === '<>') ok = cmp !== 0
          else if (op === '<') ok = cmp < 0
          else if (op === '<=') ok = cmp <= 0
          else if (op === '>') ok = cmp > 0
          else if (op === '>=') ok = cmp >= 0
          left = { kind: 'boolean', value: ok }
        }
        return left
      }

      function parseConcat(): EvalResult {
        let left = parseAddSub()
        while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '&') {
          consume()
          const right = parseAddSub()
          left = { kind: 'string', value: toStringVal(scalar(left)) + toStringVal(scalar(right)) }
        }
        return left
      }

      function parseAddSub(): EvalResult {
        let left = parseMulDiv()
        while (peek()?.type === 'op' && ((peek() as { type: 'op'; value: string }).value === '+' || (peek() as { type: 'op'; value: string }).value === '-')) {
          const op = (consume() as { type: 'op'; value: string }).value
          const right = parseMulDiv()
          const a = toNumber(scalar(left))
          const b = toNumber(scalar(right))
          left = { kind: 'number', value: op === '+' ? a + b : a - b }
        }
        return left
      }

      function parseMulDiv(): EvalResult {
        let left = parsePower()
        while (peek()?.type === 'op' && ((peek() as { type: 'op'; value: string }).value === '*' || (peek() as { type: 'op'; value: string }).value === '/')) {
          const op = (consume() as { type: 'op'; value: string }).value
          const right = parsePower()
          const a = toNumber(scalar(left))
          const b = toNumber(scalar(right))
          if (op === '/' && b === 0) throw new FormulaError('#DIV/0!')
          left = { kind: 'number', value: op === '*' ? a * b : a / b }
        }
        return left
      }

      function parsePower(): EvalResult {
        let left = parseUnary()
        if (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '^') {
          consume()
          const right = parsePower()
          left = { kind: 'number', value: toNumber(scalar(left)) ** toNumber(scalar(right)) }
        }
        return left
      }

      function parseUnary(): EvalResult {
        if (peek()?.type === 'op' && ((peek() as { type: 'op'; value: string }).value === '-' || (peek() as { type: 'op'; value: string }).value === '+')) {
          const op = (consume() as { type: 'op'; value: string }).value
          const val = parseUnary()
          const n = toNumber(scalar(val))
          return { kind: 'number', value: op === '-' ? -n : n }
        }
        let val = parsePrimary()
        while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '%') {
          consume()
          val = { kind: 'number', value: toNumber(scalar(val)) / 100 }
        }
        return val
      }

      function parsePrimary(): EvalResult {
        const tok = peek()
        if (!tok) throw new FormulaError('#ERR!')

        if (tok.type === 'number') {
          consume()
          return { kind: 'number', value: tok.value }
        }
        if (tok.type === 'string') {
          consume()
          return { kind: 'string', value: tok.value }
        }
        if (tok.type === 'lparen') {
          consume()
          const inner = parseComparison()
          if (peek()?.type !== 'rparen') throw new FormulaError('#ERR!')
          consume()
          return inner
        }
        if (tok.type === 'ident') {
          consume()
          // Function call?
          if (peek()?.type === 'lparen') {
            consume()
            const args: EvalResult[] = []
            if (peek()?.type !== 'rparen') {
              // Special-case IFERROR so errors inside arg 0 don't abort before IFERROR catches them
              const fnUpper = tok.value.toUpperCase()
              while (true) {
                if (fnUpper === 'IFERROR' && args.length === 0) {
                  try {
                    args.push(parseComparison())
                  } catch (e) {
                    if (e instanceof FormulaError) args.push({ kind: 'error', code: e.code })
                    else throw e
                  }
                } else {
                  args.push(parseComparison())
                }
                if (peek()?.type === 'comma') {
                  consume()
                  continue
                }
                break
              }
            }
            if (peek()?.type !== 'rparen') throw new FormulaError('#ERR!')
            consume()
            return callFunction(tok.value, args)
          }

          // Cross-sheet reference: SheetName!A1 or SheetName!A1:B5
          let targetSheetId = currentSheetId
          let cellToken = tok.value
          if (peek()?.type === 'bang') {
            consume()
            const found = sheetByName.get(tok.value.toLowerCase())
            if (!found) throw new FormulaError('#REF!')
            targetSheetId = found.id
            const nextTok = peek()
            if (!nextTok || nextTok.type !== 'ident') throw new FormulaError('#REF!')
            consume()
            cellToken = nextTok.value
          }

          // Boolean literals
          if (targetSheetId === currentSheetId && cellToken.toUpperCase() === 'TRUE') {
            return { kind: 'boolean', value: true }
          }
          if (targetSheetId === currentSheetId && cellToken.toUpperCase() === 'FALSE') {
            return { kind: 'boolean', value: false }
          }

          // Cell or range reference
          if (CELL_RE.test(cellToken)) {
            if (peek()?.type === 'colon') {
              consume()
              const endTok = peek()
              if (!endTok || endTok.type !== 'ident' || !CELL_RE.test(endTok.value)) {
                throw new FormulaError('#REF!')
              }
              consume()
              return evalRange(targetSheetId, cellToken, endTok.value)
            }
            return evalCell(targetSheetId, cellToken)
          }

          throw new FormulaError('#NAME?')
        }

        throw new FormulaError('#ERR!')
      }

      const res = parseComparison()
      if (pos < tokens.length) throw new FormulaError('#ERR!')
      return scalar(res)
    } catch (e) {
      if (e instanceof FormulaError) return { kind: 'error', code: e.code }
      return { kind: 'error', code: '#ERR!' }
    }
  }

  for (const s of wb.sheets) {
    for (const key of Object.keys(s.cells)) {
      evalCell(s.id, key)
    }
  }

  return cache
}

export function formatCellValue(value: CellValue, format: NumberFormat = 'auto'): string {
  switch (value.kind) {
    case 'empty':
      return ''
    case 'error':
      return value.code
    case 'boolean':
      return value.value ? 'TRUE' : 'FALSE'
    case 'string':
      return value.value
    case 'number': {
      const n = value.value
      if (!Number.isFinite(n)) return '#ERR!'
      if (format === 'currency') {
        const neg = n < 0
        const abs = Math.abs(n).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        return neg ? `-$${abs}` : `$${abs}`
      }
      if (format === 'percent') {
        return `${(n * 100).toFixed(1)}%`
      }
      if (format === 'integer') {
        return Math.round(n).toLocaleString('en-US')
      }
      if (format === 'decimal') {
        return n.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      }
      // auto
      if (Number.isInteger(n)) return n.toLocaleString('en-US')
      return Number(n.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: 4 })
    }
  }
}

export const SUPPORTED_FUNCTIONS = [
  'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'COUNTIF', 'SUMIF',
  'MEDIAN', 'STDEV', 'ROUND', 'FLOOR', 'CEIL', 'ABS', 'SQRT', 'POWER', 'MOD',
  'IF', 'AND', 'OR', 'NOT', 'IFERROR', 'ISBLANK', 'ISNUMBER',
  'VLOOKUP', 'INDEX', 'MATCH', 'CHOOSE',
  'CONCAT', 'LEN', 'UPPER', 'LOWER', 'TRIM', 'LEFT', 'RIGHT', 'MID',
  'PMT', 'FV', 'PV', 'NPV',
] as const
