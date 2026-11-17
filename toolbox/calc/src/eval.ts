// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Recursive-descent parser and evaluator for real expressions.
// Grammar:
//   expr   = term (('+'|'-') term)*
//   term   = power (('*'|'/') power)*
//   power  = unary ('^' unary)?   // right-associative
//   unary  = ('+'|'-') unary | primary
//   primary = number | ident | ident '(' args ')' | '(' expr ')'

import type { AngleMode, CalcError, CalcErrorCode, EvaluateOptions } from './types'

export class CalcFail extends Error {
  code: CalcErrorCode
  index?: number
  source: string

  constructor(code: CalcErrorCode, message: string, source: string, index?: number) {
    super(message)
    this.code = code
    this.source = source
    this.index = index
  }
}

export function toCalcError(e: unknown, source: string): CalcError {
  if (e instanceof CalcFail) {
    return { ok: false, code: e.code, message: e.message, index: e.index, source: e.source }
  }
  const msg = e instanceof Error ? e.message : String(e)
  return { ok: false, code: 'syntax', message: msg, source }
}

type Tok =
  | { kind: 'num'; value: number; i: number }
  | { kind: 'id'; value: string; i: number }
  | { kind: 'op'; value: string; i: number }
  | { kind: 'eof'; i: number }

const OPS = new Set(['+', '-', '*', '/', '^', '(', ')', ','])

function tokenize(source: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < source.length) {
    const c = source[i]!
    if (/\s/.test(c)) { i++; continue }
    if (OPS.has(c)) { out.push({ kind: 'op', value: c, i }); i++; continue }
    if (/[0-9.]/.test(c)) {
      const start = i
      let sawDot = c === '.'
      i++
      while (i < source.length) {
        const d = source[i]!
        if (d === '.' && !sawDot) { sawDot = true; i++; continue }
        if (/[0-9]/.test(d)) { i++; continue }
        break
      }
      const raw = source.slice(start, i)
      const n = Number(raw)
      if (!Number.isFinite(n) || raw === '.' || raw === '') {
        throw new CalcFail('syntax', `Invalid number "${raw}"`, source, start)
      }
      out.push({ kind: 'num', value: n, i: start })
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i
      i++
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i]!)) i++
      out.push({ kind: 'id', value: source.slice(start, i).toLowerCase(), i: start })
      continue
    }
    throw new CalcFail('syntax', `Unexpected character "${c}"`, source, i)
  }
  out.push({ kind: 'eof', i: source.length })
  return out
}

type Ast =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: '+' | '-'; arg: Ast }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Ast; right: Ast }
  | { kind: 'call'; name: string; args: Ast[] }

class Parser {
  private toks: Tok[]
  private p = 0
  readonly source: string

  constructor(source: string) {
    this.source = source
    this.toks = tokenize(source)
  }

  private peek(): Tok { return this.toks[this.p]! }
  private advance(): Tok { return this.toks[this.p++]! }

  private expectOp(value: string): void {
    const t = this.peek()
    if (t.kind !== 'op' || t.value !== value) {
      throw new CalcFail('syntax', `Expected "${value}"`, this.source, t.i)
    }
    this.advance()
  }

  private isOp(value: string): boolean {
    const t = this.peek()
    return t.kind === 'op' && t.value === value
  }

  parse(): Ast {
    if (this.peek().kind === 'eof') {
      throw new CalcFail('empty', 'Expression is empty', this.source, 0)
    }
    const ast = this.expr()
    if (this.peek().kind !== 'eof') {
      throw new CalcFail('syntax', 'Unexpected trailing input', this.source, this.peek().i)
    }
    return ast
  }

  private expr(): Ast {
    let left = this.term()
    for (;;) {
      const t = this.peek()
      if (t.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.advance()
        left = { kind: 'bin', op: t.value, left, right: this.term() }
        continue
      }
      break
    }
    return left
  }

  private term(): Ast {
    let left = this.power()
    for (;;) {
      const t = this.peek()
      if (t.kind === 'op' && (t.value === '*' || t.value === '/')) {
        this.advance()
        left = { kind: 'bin', op: t.value, left, right: this.power() }
        continue
      }
      break
    }
    return left
  }

  private power(): Ast {
    const base = this.unary()
    const t = this.peek()
    if (t.kind === 'op' && t.value === '^') {
      this.advance()
      // Right-associative: a^b^c = a^(b^c)
      return { kind: 'bin', op: '^', left: base, right: this.power() }
    }
    return base
  }

  private unary(): Ast {
    const t = this.peek()
    if (t.kind === 'op' && (t.value === '+' || t.value === '-')) {
      this.advance()
      return { kind: 'unary', op: t.value, arg: this.unary() }
    }
    return this.primary()
  }

  private primary(): Ast {
    const t = this.peek()
    if (t.kind === 'num') {
      this.advance()
      return { kind: 'num', value: t.value }
    }
    if (t.kind === 'id') {
      this.advance()
      if (this.isOp('(')) {
        this.advance()
        const args: Ast[] = []
        if (!this.isOp(')')) {
          args.push(this.expr())
          while (this.isOp(',')) {
            this.advance()
            args.push(this.expr())
          }
        }
        this.expectOp(')')
        return { kind: 'call', name: t.value, args }
      }
      return { kind: 'var', name: t.value }
    }
    if (t.kind === 'op' && t.value === '(') {
      this.advance()
      const inner = this.expr()
      this.expectOp(')')
      return inner
    }
    throw new CalcFail('syntax', 'Expected a number, name, or "("', this.source, t.i)
  }
}

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
}

const FUNCS: Record<string, { arity: number; fn: (args: number[], angle: AngleMode) => number }> = {
  sqrt: { arity: 1, fn: ([a]) => {
    if (a! < 0) throw domain('Square root of a negative number')
    return Math.sqrt(a!)
  } },
  abs: { arity: 1, fn: ([a]) => Math.abs(a!) },
  ln: { arity: 1, fn: ([a]) => {
    if (a! <= 0) throw domain('Natural log of a non-positive number')
    return Math.log(a!)
  } },
  log: { arity: 1, fn: ([a]) => {
    if (a! <= 0) throw domain('Log of a non-positive number')
    return Math.log10(a!)
  } },
  sin: { arity: 1, fn: ([a], angle) => Math.sin(toRad(a!, angle)) },
  cos: { arity: 1, fn: ([a], angle) => Math.cos(toRad(a!, angle)) },
  tan: { arity: 1, fn: ([a], angle) => {
    const r = toRad(a!, angle)
    const c = Math.cos(r)
    if (Math.abs(c) < 1e-15) throw domain('Tangent undefined at this angle')
    return Math.sin(r) / c
  } },
}

function domain(message: string): CalcFail {
  return new CalcFail('domain', message, '')
}

function toRad(v: number, angle: AngleMode): number {
  return angle === 'deg' ? (v * Math.PI) / 180 : v
}

export function parseAst(source: string): Ast {
  return new Parser(source).parse()
}

export function evalAst(
  ast: Ast,
  opts: EvaluateOptions,
  source: string,
): number {
  const angle: AngleMode = opts.degrees ? 'deg' : 'rad'
  const vars = opts.vars ?? {}

  const evalNode = (n: Ast): number => {
    switch (n.kind) {
      case 'num':
        return n.value
      case 'var': {
        if (Object.prototype.hasOwnProperty.call(CONSTS, n.name)) return CONSTS[n.name]!
        if (Object.prototype.hasOwnProperty.call(vars, n.name)) return vars[n.name]!
        throw new CalcFail('unknown', `Unknown name "${n.name}"`, source)
      }
      case 'unary': {
        const v = evalNode(n.arg)
        return n.op === '-' ? -v : v
      }
      case 'bin': {
        const L = evalNode(n.left)
        const R = evalNode(n.right)
        switch (n.op) {
          case '+': return L + R
          case '-': return L - R
          case '*': return L * R
          case '/':
            if (R === 0) throw new CalcFail('divzero', 'Division by zero', source)
            return L / R
          case '^': return L ** R
        }
        break
      }
      case 'call': {
        const spec = FUNCS[n.name]
        if (!spec) throw new CalcFail('unknown', `Unknown function "${n.name}"`, source)
        if (n.args.length !== spec.arity) {
          throw new CalcFail(
            'arity',
            `${n.name} expects ${spec.arity} argument${spec.arity === 1 ? '' : 's'}`,
            source,
          )
        }
        const args = n.args.map(evalNode)
        try {
          const v = spec.fn(args, angle)
          if (!Number.isFinite(v)) throw new CalcFail('domain', 'Result is not a finite number', source)
          return v
        } catch (e) {
          if (e instanceof CalcFail) {
            if (!e.source) e.source = source
            throw e
          }
          throw e
        }
      }
    }
    throw new CalcFail('syntax', 'Internal evaluate error', source)
  }

  const out = evalNode(ast)
  if (!Number.isFinite(out)) {
    throw new CalcFail('domain', 'Result is not a finite number', source)
  }
  return out
}

/** True when the AST references the free variable `x`. */
export function usesX(ast: Ast): boolean {
  switch (ast.kind) {
    case 'num': return false
    case 'var': return ast.name === 'x'
    case 'unary': return usesX(ast.arg)
    case 'bin': return usesX(ast.left) || usesX(ast.right)
    case 'call': return ast.args.some(usesX)
  }
}
