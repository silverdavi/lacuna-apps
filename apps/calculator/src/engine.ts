// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
export type AngleMode = 'Degrees' | 'Radians'

type Tok =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: string }
  | { kind: 'name'; value: string }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' }

const FUNCS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs'])

export function tokenize(input: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  const s = input
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      const text = s.slice(i, j)
      const value = Number(text)
      if (!Number.isFinite(value)) throw new Error('Bad number: ' + text)
      toks.push({ kind: 'num', value })
      i = j
      continue
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++
      toks.push({ kind: 'name', value: s.slice(i, j) })
      i = j
      continue
    }
    if (c === '*') {
      if (s[i + 1] === '*') {
        toks.push({ kind: 'op', value: '^' })
        i += 2
      } else {
        toks.push({ kind: 'op', value: '*' })
        i++
      }
      continue
    }
    if ('+-/^'.includes(c)) {
      toks.push({ kind: 'op', value: c })
      i++
      continue
    }
    if (c === '(') {
      toks.push({ kind: 'lparen' })
      i++
      continue
    }
    if (c === ')') {
      toks.push({ kind: 'rparen' })
      i++
      continue
    }
    if (c === ',') {
      toks.push({ kind: 'comma' })
      i++
      continue
    }
    throw new Error('Unexpected character: ' + c)
  }
  return toks
}

function parsePostfix(toks: Tok[], mode: AngleMode): number {
  const stack: number[] = []
  const call = (name: string, arg: number): number => {
    const rad = mode === 'Degrees' ? (arg * Math.PI) / 180 : arg
    switch (name) {
      case 'sin':
        return Math.sin(rad)
      case 'cos':
        return Math.cos(rad)
      case 'tan':
        return Math.tan(rad)
      case 'log':
        return Math.log10(arg)
      case 'ln':
        return Math.log(arg)
      case 'sqrt':
        return Math.sqrt(arg)
      case 'abs':
        return Math.abs(arg)
      default:
        throw new Error('Unknown function: ' + name)
    }
  }
  for (const t of toks) {
    if (t.kind === 'num') {
      stack.push(t.value)
    } else if (t.kind === 'op') {
      if (t.value === '^') {
        const b = stack.pop()
        const a = stack.pop()
        if (a === undefined || b === undefined) throw new Error('Bad expression')
        stack.push(Math.pow(a, b))
      } else {
        const b = stack.pop()
        const a = stack.pop()
        if (a === undefined || b === undefined) throw new Error('Bad expression')
        if (t.value === '+') stack.push(a + b)
        else if (t.value === '-') stack.push(a - b)
        else if (t.value === '*') stack.push(a * b)
        else {
          if (b === 0) throw new Error('Division by zero')
          stack.push(a / b)
        }
      }
    } else if (t.kind === 'name') {
      const a = stack.pop()
      if (a === undefined) throw new Error('Bad expression')
      stack.push(call(t.value, a))
    }
  }
  if (stack.length !== 1) throw new Error('Bad expression')
  return stack[0]
}

export function evaluate(input: string, mode: AngleMode = 'Degrees'): number {
  const raw = tokenize(input)
  const out: Tok[] = []
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 }
  const stack: Tok[] = []
  for (const t of raw) {
    if (t.kind === 'num') {
      out.push(t)
    } else if (t.kind === 'name') {
      if (!FUNCS.has(t.value)) throw new Error('Unknown function: ' + t.value)
      stack.push(t)
    } else if (t.kind === 'op') {
      while (stack.length > 0) {
        const top = stack[stack.length - 1]
        if (top === undefined) break
        if (top.kind === 'op' && (prec[top.value] ?? 0) >= (prec[t.value] ?? 0)) {
          const o = stack.pop()
          if (o && o.kind === 'op') out.push(o)
          else break
        } else if (top.kind === 'name') {
          out.push(stack.pop() as Tok)
        } else {
          break
        }
      }
      stack.push(t)
    } else if (t.kind === 'lparen') {
      stack.push(t)
    } else if (t.kind === 'rparen') {
      while (stack.length > 0) {
        const o = stack.pop()
        if (o === undefined) break
        if (o.kind === 'lparen') break
        out.push(o)
      }
      if (stack.length === 0) throw new Error('Mismatched parentheses')
      const top = stack[stack.length - 1]
      if (top && top.kind === 'name') out.push(stack.pop() as Tok)
    } else if (t.kind === 'comma') {
      throw new Error('Comma not supported')
    }
  }
  while (stack.length > 0) {
    const o = stack.pop()
    if (o === undefined) break
    if (o.kind === 'lparen') throw new Error('Mismatched parentheses')
    out.push(o)
  }
  const result = parsePostfix(out, mode)
  if (!Number.isFinite(result)) throw new Error('Result is not finite')
  return result
}

export function formatValue(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  if (Object.is(rounded, -0)) return '0'
  const text = String(rounded)
  return /^-?\d+(\.\d*0+)?$/.test(text) ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

export interface SeriesPoint {
  x: number
  y: number
}

export function sampleSeries(
  input: string,
  mode: AngleMode,
  from = 0,
  to = 360,
  step = 15,
): { points: SeriesPoint[]; atX: SeriesPoint | null } {
  const xVar = /^x$/i.test(input.replace(/\s+/g, '')) || /\bx\b/i.test(input)
  if (!xVar) return { points: [], atX: null }
  const points: SeriesPoint[] = []
  let atX: SeriesPoint | null = null
  for (let x = from; x <= to + 0.0001; x += step) {
    const xr = Math.round(x * 100) / 100
    let y: number
    try {
      y = evaluate(input.replace(/\bx\b/gi, String(xr)), mode)
    } catch {
      y = 0
    }
    const point: SeriesPoint = { x: xr, y: Number(formatValue(y)) }
    points.push(point)
    if (Math.abs(xr - 30) < 0.0001) atX = point
  }
  return { points, atX }
}
