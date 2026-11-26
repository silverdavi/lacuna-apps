// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.

type Token =
  | { type: 'number'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }

type Node =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'call'; name: string; arg: Node }
  | { type: 'unary'; op: string; operand: Node }
  | { type: 'binary'; op: string; left: Node; right: Node }

const FUNCTIONS: Record<string, (x: number) => number> = {
  log: (x) => Math.log10(x),
  ln: (x) => Math.log(x),
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  sec: (x) => 1 / Math.cos(x),
  csc: (x) => 1 / Math.sin(x),
  cot: (x) => 1 / Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  exp: (x) => Math.exp(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
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
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    if (ch >= '0' && ch <= '9' || ch === '.') {
      let j = i
      while (j < source.length && (source[j] >= '0' && source[j] <= '9' || source[j] === '.')) j++
      const text = source.slice(i, j)
      const value = Number(text)
      if (Number.isNaN(value)) throw new Error(`Invalid number "${text}"`)
      tokens.push({ type: 'number', value })
      i = j
      continue
    }
    if (ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch === '_') {
      let j = i
      while (j < source.length && (source[j] >= 'a' && source[j] <= 'z' || source[j] >= 'A' && source[j] <= 'Z' || source[j] >= '0' && source[j] <= '9' || source[j] === '_')) j++
      const text = source.slice(i, j).toLowerCase()
      tokens.push({ type: 'ident', value: text })
      i = j
      continue
    }
    throw new Error(`Unexpected character "${ch}"`)
  }
  return tokens
}

function insertImplicitMult(tokens: Token[]): Token[] {
  const out: Token[] = []
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i]
    if (out.length > 0) {
      const prev = out[out.length - 1]
      const prevEndsValue =
        prev.type === 'number' || prev.type === 'ident' || (prev.type === 'rparen')
      const curStartsValue =
        cur.type === 'number' || cur.type === 'ident' || (cur.type === 'lparen')
      if (prevEndsValue && curStartsValue) {
        if (prev.type === 'ident' && FUNCTIONS[prev.value as string] && cur.type === 'lparen') {
          // function name followed by lparen: do NOT insert implicit mult
        } else {
          out.push({ type: 'op', value: '*' })
        }
      }
    }
    out.push(cur)
  }
  return out
}

function parse(tokens: Token[]): Node {
  let pos = 0
  const peek = (): Token | undefined => tokens[pos]
  const take = (): Token => {
    const t = tokens[pos]
    if (!t) throw new Error('Unexpected end of expression')
    pos++
    return t
  }

  function isOp(t: Token | undefined, ops: string[]): boolean {
    if (!t || t.type !== 'op') return false
    return ops.includes((t as { value: string }).value)
  }

  function parseExpr(): Node {
    let node = parseTerm()
    while (isOp(peek(), ['+', '-'])) {
      const op = (take() as { value: string }).value
      const right = parseTerm()
      node = { type: 'binary', op, left: node, right }
    }
    return node
  }

  function parseTerm(): Node {
    let node = parsePower()
    while (isOp(peek(), ['*', '/'])) {
      const op = (take() as { value: string }).value
      const right = parsePower()
      node = { type: 'binary', op, left: node, right }
    }
    return node
  }

  function parsePower(): Node {
    const base = parseUnary()
    if (isOp(peek(), ['^'])) {
      take()
      const exponent = parsePower()
      return { type: 'binary', op: '^', left: base, right: exponent }
    }
    return base
  }

  function parseUnary(): Node {
    const t = peek()
    if (isOp(t, ['+', '-'])) {
      const op = (take() as { value: string }).value
      const operand = parseUnary()
      if (op === '-') {
        return { type: 'unary', op: '-', operand }
      }
      return operand
    }
    return parsePrimary()
  }

  function parsePrimary(): Node {
    const t = take()
    if (t.type === 'number') {
      return { type: 'number', value: t.value }
    }
    if (t.type === 'lparen') {
      const inner = parseExpr()
      const close = take()
      if (close.type !== 'rparen') throw new Error('Expected )')
      return inner
    }
    if (t.type === 'ident') {
      const next = peek()
      if (next && next.type === 'lparen') {
        take()
        const arg = parseExpr()
        const close = take()
        if (close.type !== 'rparen') throw new Error('Expected )')
        if (!(t.value in FUNCTIONS)) throw new Error(`Unknown function "${t.value}"`)
        return { type: 'call', name: t.value, arg }
      }
      if (t.value in FUNCTIONS) {
        const operand = parsePower()
        return { type: 'call', name: t.value, arg: operand }
      }
      if (t.value in CONSTANTS) {
        return { type: 'number', value: CONSTANTS[t.value] }
      }
      return { type: 'variable', name: t.value }
    }
    throw new Error('Unexpected token')
  }

  const root = parseExpr()
  if (pos < tokens.length) throw new Error('Unexpected trailing input')
  return root
}

function evaluate(node: Node, x: number): number {
  switch (node.type) {
    case 'number':
      return node.value
    case 'variable':
      if (node.name === 'x') return x
      if (node.name in CONSTANTS) return CONSTANTS[node.name]
      throw new Error(`Unknown variable "${node.name}"`)
    case 'call':
      return FUNCTIONS[node.name](evaluate(node.arg, x))
    case 'unary':
      return -evaluate(node.operand, x)
    case 'binary': {
      const left = evaluate(node.left, x)
      const right = evaluate(node.right, x)
      switch (node.op) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          return left / right
        case '^':
          return Math.pow(left, right)
        default:
          throw new Error(`Unknown operator "${node.op}"`)
      }
    }
  }
}

export function compile(expression: string): (x: number) => number {
  const ast = parse(insertImplicitMult(tokenize(expression.trim())))
  return (x: number) => evaluate(ast, x)
}
