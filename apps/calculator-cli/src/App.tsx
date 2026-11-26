// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Row,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

interface HistoryEntry {
  expression: string
  result: string
}

interface PersistedState {
  expression: string
  result: string
  precision: number
  history: HistoryEntry[]
}

const DEFAULT_STATE: PersistedState = {
  expression: '',
  result: '',
  precision: 2,
  history: [],
}

const PRECISION_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'].map((v) => ({
  value: v,
  label: `${v} decimal${v === '0' || v === '1' ? '' : 's'}`,
}))

type Tok =
  | { t: 'num'; v: number }
  | { t: 'var' }
  | { t: 'op'; v: string }
  | { t: 'lparen' }
  | { t: 'rparen' }

function tokenize(input: string, allowVar: boolean): Tok[] | null {
  const toks: Tok[] = []
  let i = 0
  const s = input
  while (i < s.length) {
    const c = s[i]
    if (c === ' ') {
      i += 1
      continue
    }
    if (c === '(') {
      toks.push({ t: 'lparen' })
      i += 1
      continue
    }
    if (c === ')') {
      toks.push({ t: 'rparen' })
      i += 1
      continue
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^' || c === '%') {
      toks.push({ t: 'op', v: c })
      i += 1
      continue
    }
    if (allowVar && (c === 'x' || c === 'X')) {
      toks.push({ t: 'var' })
      i += 1
      continue
    }
    if (c >= '0' && c <= '9' || c === '.') {
      let j = i
      let dots = 0
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) {
        if (s[j] === '.') dots += 1
        j += 1
      }
      const numStr = s.slice(i, j)
      if (dots > 1) return null
      const val = Number(numStr)
      if (!Number.isFinite(val)) return null
      toks.push({ t: 'num', v: val })
      i = j
      continue
    }
    return null
  }
  return toks
}

type ExprNode =
  | { kind: 'num'; v: number }
  | { kind: 'var' }
  | { kind: 'neg'; a: ExprNode }
  | { kind: 'bin'; op: string; l: ExprNode; r: ExprNode }

function parsePrimary(toks: Tok[], pos: number, allowVar: boolean): { node: ExprNode; next: number } | null {
  const tok = toks[pos]
  if (!tok) return null
  if (tok.t === 'num') return { node: { kind: 'num', v: tok.v }, next: pos + 1 }
  if (tok.t === 'var') return { node: { kind: 'var' }, next: pos + 1 }
  if (tok.t === 'lparen') {
    const inner = parseExpr(toks, pos + 1, allowVar)
    if (!inner) return null
    if (toks[inner.next]?.t !== 'rparen') return null
    return { node: inner.node, next: inner.next + 1 }
  }
  return null
}

function parseUnary(toks: Tok[], pos: number, allowVar: boolean): { node: ExprNode; next: number } | null {
  const tok = toks[pos]
  if (tok && tok.t === 'op' && (tok.v === '-' || tok.v === '+')) {
    const r = parseUnary(toks, pos + 1, allowVar)
    if (!r) return null
    if (tok.v === '-') return { node: { kind: 'neg', a: r.node }, next: r.next }
    return r
  }
  return parsePostfix(toks, pos, allowVar)
}

function parsePostfix(toks: Tok[], pos: number, allowVar: boolean): { node: ExprNode; next: number } | null {
  const base = parsePrimary(toks, pos, allowVar)
  if (!base) return null
  let node = base.node
  let p = base.next
  while (p < toks.length) {
    const tok = toks[p]
    if (tok.t === 'op' && tok.v === '^') {
      p += 1
      const r = parseUnary(toks, p, allowVar)
      if (!r) return null
      node = { kind: 'bin', op: '^', l: node, r: r.node }
      p = r.next
    } else break
  }
  return { node, next: p }
}

function parseTerm(toks: Tok[], pos: number, allowVar: boolean): { node: ExprNode; next: number } | null {
  let lhs = parsePostfix(toks, pos, allowVar)
  if (!lhs) return null
  let p = lhs.next
  while (p < toks.length) {
    const tok = toks[p]
    if (tok.t === 'op' && (tok.v === '*' || tok.v === '/' || tok.v === '%')) {
      p += 1
      const rhs = parsePostfix(toks, p, allowVar)
      if (!rhs) return null
      lhs = { node: { kind: 'bin', op: tok.v, l: lhs.node, r: rhs.node }, next: rhs.next }
      p = rhs.next
    } else break
  }
  return lhs
}

function parseExpr(toks: Tok[], pos: number, allowVar: boolean): { node: ExprNode; next: number } | null {
  let lhs = parseTerm(toks, pos, allowVar)
  if (!lhs) return null
  let p = lhs.next
  while (p < toks.length) {
    const tok = toks[p]
    if (tok.t === 'op' && (tok.v === '+' || tok.v === '-')) {
      p += 1
      const rhs = parseTerm(toks, p, allowVar)
      if (!rhs) return null
      lhs = { node: { kind: 'bin', op: tok.v, l: lhs.node, r: rhs.node }, next: rhs.next }
      p = rhs.next
    } else break
  }
  return lhs
}

function evalNode(node: ExprNode, x: number): number {
  switch (node.kind) {
    case 'num':
      return node.v
    case 'var':
      return x
    case 'neg':
      return -evalNode(node.a, x)
    case 'bin': {
      const l = evalNode(node.l, x)
      const r = evalNode(node.r, x)
      switch (node.op) {
        case '+':
          return l + r
        case '-':
          return l - r
        case '*':
          return l * r
        case '/':
          return l / r
        case '%':
          return l % r
        case '^':
          return Math.pow(l, r)
        default:
          return Number.NaN
      }
    }
  }
}

function safeEvaluate(expr: string): number | null {
  const cleaned = expr.trim()
  if (!cleaned) return null
  const toks = tokenize(cleaned, false)
  if (!toks || toks.length === 0) return null
  const parsed = parseExpr(toks, 0, false)
  if (!parsed || parsed.next !== toks.length) return null
  const out = evalNode(parsed.node, 0)
  return typeof out === 'number' && Number.isFinite(out) ? out : null
}

function safeParseFunction(raw: string): ((x: number) => number) | null {
  const cleaned = raw.trim()
  if (!cleaned) return null
  const toks = tokenize(cleaned, true)
  if (!toks || toks.length === 0) return null
  const parsed = parseExpr(toks, 0, true)
  if (!parsed || parsed.next !== toks.length) return null
  const node = parsed.node
  return (x: number): number => {
    const out = evalNode(node, x)
    return typeof out === 'number' && Number.isFinite(out) ? out : Number.NaN
  }
}

function formatNumber(value: number, precision: number): string {
  return parseFloat(value.toFixed(precision)).toString()
}

export function App() {
  const [tab, setTab] = useState<'Expression' | 'Function' | 'History'>('Expression')

  const state = useLocalRecord<PersistedState>({
    key: 'calculator-cli-state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })
  const setState = state.set

  const [expressionError, setExpressionError] = useState<string | null>(null)

  const [funcText, setFuncText] = useState('')
  const [startText, setStartText] = useState('0')
  const [endText, setEndText] = useState('5')
  const [stepsText, setStepsText] = useState('5')
  const [samples, setSamples] = useState<ChartDataPoint[] | null>(null)
  const [funcError, setFuncError] = useState<string | null>(null)

  const { copy, copied } = useClipboard({ timeoutMs: 1500 })

  const chartHostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const host = document.createElement('div')
    host.setAttribute('data-lacuna-chart-portal', '')
    document.body.prepend(host)
    chartHostRef.current = host
    return () => {
      document.body.contains(host) && document.body.removeChild(host)
      chartHostRef.current = null
    }
  }, [])

  const precision = state.value.precision

  function onEvaluate() {
    const trimmed = state.value.expression.trim()
    if (!trimmed) {
      setExpressionError('Type an expression first')
      return
    }
    const value = safeEvaluate(trimmed)
    if (value === null) {
      setExpressionError('Could not evaluate that expression')
      return
    }
    const formatted = formatNumber(value, precision)
    setExpressionError(null)
    setState((prev) => ({
      ...prev,
      expression: trimmed,
      result: formatted,
      history: [{ expression: trimmed, result: formatted }, ...prev.history].slice(0, 50),
    }))
  }

  function onCopy() {
    if (state.value.result) void copy(state.value.result)
  }

  function onReset() {
    setExpressionError(null)
    setState((prev) => ({ ...prev, expression: '', result: '' }))
  }

  function onClearHistory() {
    setState((prev) => ({ ...prev, history: [] }))
  }

  function onSample() {
    const fn = safeParseFunction(funcText)
    if (!fn) {
      setFuncError('Type a function of x, e.g. x^2')
      setSamples(null)
      return
    }
    const start = Number(startText)
    const end = Number(endText)
    const steps = Number(stepsText)
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(steps)) {
      setFuncError('Start, End and Steps must each be a number')
      setSamples(null)
      return
    }
    if (!Number.isInteger(steps) || steps < 1 || steps > 1000) {
      setFuncError('Steps must be a whole number between 1 and 1000')
      setSamples(null)
      return
    }
    if (end < start) {
      setFuncError('End must be greater than or equal to Start')
      setSamples(null)
      return
    }
    const next: ChartDataPoint[] = []
    for (let i = 0; i <= steps; i++) {
      const x = start + ((end - start) * i) / steps
      const y = fn(x)
      if (Number.isNaN(y)) {
        setFuncError(`f(x) is not defined at x = ${x.toFixed(2)}`)
        setSamples(null)
        return
      }
      next.push({ label: `x: ${x.toFixed(2)}`, value: y })
    }
    setFuncError(null)
    setSamples(next)
  }

  const sampleRows = useMemo(() => {
    if (!samples) return []
    return samples.map((p) => ({
      x: p.label,
      y: `y: ${p.value.toFixed(2)}`,
    }))
  }, [samples])

  return (
    <AppShell name="Expression Calculator" icon="docs" hue="rust" category="Apps" meta="Expression, function, history">
      <div className="lc-tabs" role="tablist">
        {(['Expression', 'Function', 'History'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`lc-tab${tab === t ? ' active' : ''}`}
            style={tab === t ? undefined : { color: 'var(--ink-60)' }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Expression' && (
        <Stack lg>
          <Card title="Expression">
            <FormGrid>
              <TextInput
                label="Expression"
                value={state.value.expression}
                onChange={(v) => setState((prev) => ({ ...prev, expression: v }))}
                placeholder="e.g. 2+3*4"
                error={expressionError}
              />
              <Select
                label="Precision"
                value={String(precision)}
                options={PRECISION_OPTIONS}
                onChange={(v) => setState((prev) => ({ ...prev, precision: Number(v) }))}
              />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={onEvaluate}>
                Evaluate
              </Button>
              <Button kind="secondary" onClick={onCopy} disabled={!state.value.result}>
                {copied ? 'Copied' : 'Copy result'}
              </Button>
              <Button kind="ghost" onClick={onReset}>
                Reset
              </Button>
            </Actions>
          </Card>

          <Card title="Result summary">
            {state.value.result ? (
              <KpiRow>
                <Kpi label="Value" value={state.value.result} accent />
                <Kpi label="Expression" value={state.value.expression} />
                <Kpi label="Precision" value={String(precision)} />
              </KpiRow>
            ) : (
              <EmptyState title="No result yet" detail="Enter an expression and press Evaluate." actionLabel="Evaluate" />
            )}
          </Card>
        </Stack>
      )}

      {tab === 'Function' && (
        <Stack lg>
          <Card title="Sample a function">
            <FormGrid>
              <TextInput label="Function" value={funcText} onChange={setFuncText} placeholder="e.g. x^2" error={funcError} />
              <TextInput label="Start" value={startText} onChange={setStartText} inputMode="decimal" />
              <TextInput label="End" value={endText} onChange={setEndText} inputMode="decimal" />
              <TextInput label="Steps" value={stepsText} onChange={setStepsText} inputMode="numeric" />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={onSample}>
                Sample
              </Button>
            </Actions>
          </Card>

          {samples && (
            <Stack lg>
              <Card title="Sampled values">
                <table className="lc-table" aria-label="Sampled values">
                  <tbody>
                    {sampleRows.map((r) => (
                      <tr key={r.x}>
                        <td data-label="x">{r.x}</td>
                        <td className="num" data-label="y">{r.y}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <Card title="Graph">
                {chartHostRef.current &&
                  createPortal(
                    <Chart type="line" data={samples} title="Function samples" ariaLabel="Function samples" />,
                    chartHostRef.current,
                  )}
              </Card>
            </Stack>
          )}
        </Stack>
      )}

      {tab === 'History' && (
        <Card title="History">
          {state.value.history.length === 0 ? (
            <EmptyState title="No history" detail="Evaluate some expressions to see them here." actionLabel="Evaluate" />
          ) : (
            <Stack>
              <List label="History">
                {state.value.history.map((entry, idx) => (
                  <Row key={`${entry.expression}-${idx}`} title={`${entry.expression} = ${entry.result}`} />
                ))}
              </List>
              <Actions>
                <Button kind="secondary" onClick={onClearHistory}>
                  Clear history
                </Button>
              </Actions>
            </Stack>
          )}
        </Card>
      )}
    </AppShell>
  )
}
