// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState, type KeyboardEvent } from 'react'
import { AppShell, Button, Card, Divider, FormGrid, MonoLabel, Stack, Spread, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import { Chart } from '@lacuna/chart'
import type { ChartDataPoint } from '@lacuna/chart'
import { CalculatorKit } from '@lacuna/calculator-kit'

// A label input that mirrors the kit TextInput markup (so getByLabel resolves) but accepts
// an onKeyDown, so the Expression field can commit on Enter.
function FieldInput({
  label,
  value,
  placeholder,
  inputMode,
  error,
  hint,
  onChange,
  onKeyDown,
}: {
  label: string
  value: string
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  error?: string | null
  hint?: string
  onChange: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  const invalid = error ? true : undefined
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      <input
        className="lc-input"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {error ? <span className="lk-field-error" role="alert">{error}</span> : hint ? <span className="lk-field-hint">{hint}</span> : null}
    </label>
  )
}

// A labelled select whose accessible name is the label alone. The kit Select wraps the
// <select> (and its <option> children) inside the <label>, which folds every option's text
// into the control's accessible name and breaks getByLabel('Category'). This version points
// aria-labelledby at the label span, so the accessible name is exactly the label text.
function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const id = `lc-select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <div className="lc-field">
      <span id={id} className="lc-field-label">
        {label}
      </span>
      <select className="lc-input" value={value} aria-labelledby={id} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

const TABS = ['Calc', 'Convert', 'Plot'] as const
type Tab = (typeof TABS)[number]

interface HistoryEntry {
  id: string
  expression: string
  result: string
  at: number
}

type HistoryRecord = { entries: HistoryEntry[] }

const MAX_HISTORY = 50
const PLOT_SAMPLES = 121
const PLOT_X_MIN = -10
const PLOT_X_MAX = 10

const CATEGORY_OPTIONS: Record<string, string[]> = {
  Length: ['Meters', 'Kilometers', 'Feet', 'Miles', 'Inches', 'Centimeters'],
  Mass: ['Kilograms', 'Tonnes', 'Pounds', 'Grams', 'Ounces'],
  Speed: ['Meters/Second', 'Kilometers/Hour', 'Miles/Hour', 'Feet/Second'],
  Temperature: ['Celsius', 'Fahrenheit', 'Kelvin'],
}

const LENGTH_FACTORS: Record<string, number> = {
  Meters: 1,
  Feet: 0.3048,
  Kilometers: 1000,
  Miles: 1609.344,
  Inches: 0.0254,
  Centimeters: 0.01,
}

const LENGTH_TO_METER: Record<string, number> = LENGTH_FACTORS

const MASS_TO_KG: Record<string, number> = {
  Kilograms: 1,
  Pounds: 0.45359237,
  Grams: 0.001,
  Ounces: 0.028349523125,
  Tonnes: 1000,
}

const SPEED_TO_MS: Record<string, number> = {
  'Meters/Second': 1,
  'Kilometers/Hour': 1 / 3.6,
  'Miles/Hour': 0.44704,
  'Feet/Second': 0.3048,
}

function convertCategory(category: string, fromUnit: string, toUnit: string, value: number): number {
  if (category === 'Temperature') {
    let celsius: number
    if (fromUnit === 'Celsius') celsius = value
    else if (fromUnit === 'Fahrenheit') celsius = (value - 32) * 5 / 9
    else celsius = value - 273.15
    if (toUnit === 'Celsius') return celsius
    if (toUnit === 'Fahrenheit') return celsius * 9 / 5 + 32
    return celsius + 273.15
  }
  if (category === 'Length') {
    const meters = value * LENGTH_TO_METER[fromUnit]
    return meters / LENGTH_TO_METER[toUnit]
  }
  if (category === 'Mass') {
    const kg = value * MASS_TO_KG[fromUnit]
    return kg / MASS_TO_KG[toUnit]
  }
  const ms = value * SPEED_TO_MS[fromUnit]
  return ms / SPEED_TO_MS[toUnit]
}

/** Option labels like "Feet (Length)" — keeps unit names unique across categories. */
function truncateNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  const abs = Math.abs(rounded)
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e9)) return rounded.toExponential(3)
  return String(rounded)
}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'id'; name: string }
  | { kind: 'op'; op: string }

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j++
      const value = Number(input.slice(i, j))
      if (!Number.isFinite(value)) throw new Error('Bad number')
      tokens.push({ kind: 'num', value })
      i = j
      continue
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i
      while (j < input.length && /[a-zA-Z]/.test(input[j])) j++
      tokens.push({ kind: 'id', name: input.slice(i, j).toLowerCase() })
      i = j
      continue
    }
    if ('+-*/^()'.includes(ch)) {
      tokens.push({ kind: 'op', op: ch })
      i++
      continue
    }
    throw new Error(`Unexpected character ${ch}`)
  }
  return tokens
}

function implicitMultiply(tokens: Token[]): Token[] {
  const out: Token[] = []
  for (const token of tokens) {
    if (out.length > 0) {
      const prev = out[out.length - 1]
      const prevEndsValue = prev.kind === 'num' || (prev.kind === 'op' && prev.op === ')')
      const startsValue = token.kind === 'num' || token.kind === 'id' || (token.kind === 'op' && token.op === '(')
      if (prevEndsValue && startsValue) out.push({ kind: 'op', op: '*' })
    }
    out.push(token)
  }
  return out
}

const FUNCS: Record<string, (a: number) => number> = {
  sin: (a) => Math.sin((a * Math.PI) / 180),
  cos: (a) => Math.cos((a * Math.PI) / 180),
  tan: (a) => Math.tan((a * Math.PI) / 180),
  asin: (a) => (Math.asin(a) * 180) / Math.PI,
  acos: (a) => (Math.acos(a) * 180) / Math.PI,
  atan: (a) => (Math.atan(a) * 180) / Math.PI,
  log: Math.log10,
  ln: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
}

function evaluate(expression: string, vars: Record<string, number> = {}): number {
  const tokens = implicitMultiply(tokenize(expression))
  let pos = 0

  function peek(): Token | undefined {
    return tokens[pos]
  }

  function parseExpression(): number {
    let value = parseTerm()
    for (;;) {
      const t = peek()
      if (t && t.kind === 'op' && (t.op === '+' || t.op === '-')) {
        pos++
        const rhs = parseTerm()
        value = t.op === '+' ? value + rhs : value - rhs
      } else {
        return value
      }
    }
  }

  function parseTerm(): number {
    let value = parseFactor()
    for (;;) {
      const t = peek()
      if (t && t.kind === 'op' && (t.op === '*' || t.op === '/')) {
        pos++
        const rhs = parseFactor()
        if (t.op === '/') {
          if (rhs === 0) throw new Error('Division by zero')
          value = value / rhs
        } else {
          value = value * rhs
        }
      } else {
        return value
      }
    }
  }

  function parseFactor(): number {
    let base = parseUnary()
    const t = peek()
    if (t && t.kind === 'op' && t.op === '^') {
      pos++
      const exponent = parseFactor()
      base = Math.pow(base, exponent)
    }
    return base
  }

  function parseUnary(): number {
    const t = peek()
    if (t && t.kind === 'op' && (t.op === '+' || t.op === '-')) {
      pos++
      const value = parseUnary()
      return t.op === '-' ? -value : value
    }
    return parseAtom()
  }

  function parseAtom(): number {
    const t = peek()
    if (!t) throw new Error('Unexpected end of expression')
    if (t.kind === 'num') {
      pos++
      return t.value
    }
    if (t.kind === 'id') {
      pos++
      const next = peek()
      if (next && next.kind === 'op' && next.op === '(') {
        pos++
        const arg = parseExpression()
        expectClose()
        const fn = FUNCS[t.name]
        if (!fn) throw new Error(`Unknown function ${t.name}`)
        return fn(arg)
      }
      if (t.name === 'pi') return Math.PI
      if (t.name === 'e') return Math.E
      if (vars[t.name] !== undefined) return vars[t.name]
      throw new Error(`Unknown symbol ${t.name}`)
    }
    if (t.kind === 'op' && t.op === '(') {
      pos++
      const value = parseExpression()
      expectClose()
      return value
    }
    throw new Error(`Unexpected token ${t.kind === 'op' ? t.op : '?'}`)
  }

  function expectClose(): void {
    const t = peek()
    if (!t || t.kind !== 'op' || t.op !== ')') throw new Error('Expected )')
    pos++
  }

  const result = parseExpression()
  if (pos !== tokens.length) throw new Error('Trailing input')
  if (!Number.isFinite(result)) throw new Error('Result is not finite')
  return result
}

function formatResult(value: number): string {
  if (Object.is(value, -0)) value = 0
  const snapped = Math.round(value * 1e12) / 1e12
  if (Math.abs(snapped - Math.round(snapped)) < 1e-9) return String(Math.round(snapped))
  if (Math.abs(snapped) < 1e-6 || Math.abs(snapped) >= 1e12) return snapped.toExponential(6)
  return String(snapped)
}

function sampleFunction(expr: string, x0: number, x1: number, samples: number): [number, number][] {
  const points: [number, number][] = []
  const dx = (x1 - x0) / (samples - 1)
  for (let i = 0; i < samples; i++) {
    const x = x0 + i * dx
    try {
      const y = evaluate(expr, { x })
      if (Number.isFinite(y)) points.push([Number(x.toFixed(4)), Number(y.toFixed(4))])
    } catch {
      /* gap */
    }
  }
  return points
}

export function App() {
  const [tab, setTab] = useState<Tab>('Calc')

  const [expression, setExpression] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [category, setCategory] = useState('Length')
  const [fromUnit, setFromUnit] = useState('Meters')
  const [toUnit, setToUnit] = useState('Feet')
  const [fromValue, setFromValue] = useState<number | null>(null)

  const [functionExpr, setFunctionExpr] = useState('x^2')
  const [plotX0, setPlotX0] = useState(PLOT_X_MIN)
  const [plotX1, setPlotX1] = useState(PLOT_X_MAX)
  const [plotPoints, setPlotPoints] = useState<[number, number][]>([])

  const { value: historyRecord, set: setHistoryRecord } = useLocalRecord({
    key: 'lacuna.scientific-calculator.history',
    version: 1,
    defaultValue: { entries: [] as HistoryEntry[] },
  })

  const history = historyRecord.entries
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const units = CATEGORY_OPTIONS[category]

  const toValue = useMemo(() => {
    if (fromValue === null) return null
    return convertCategory(category, fromUnit, toUnit, fromValue)
  }, [category, fromUnit, toUnit, fromValue])

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (plotPoints.length === 0) return []
    return plotPoints.map(([x, y]) => ({ label: String(x), value: y }))
  }, [plotPoints])

  function commitExpression(value: string) {
    setExpression(value)
    if (value.trim() === '') {
      setResult('')
      setError(null)
      return
    }
    try {
      const out = evaluate(value)
      const text = formatResult(out)
      setResult(text)
      setError(null)
      setHistoryRecord((prev) => ({
        entries: [
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, expression: value, result: text, at: Date.now() },
          ...prev.entries,
        ].slice(0, MAX_HISTORY),
      }))
    } catch (err) {
      setResult('')
      setError(err instanceof Error ? err.message : 'Invalid expression')
    }
  }

  function handleClearHistory() {
    setHistoryRecord({ entries: [] })
  }

  function handleSelectCategory(next: string) {
    setCategory(next)
    const nextUnits = CATEGORY_OPTIONS[next]
    setFromUnit(nextUnits[0])
    setToUnit(nextUnits[1] ?? nextUnits[0])
    setFromValue(null)
  }

  function handlePlot() {
    try {
      const x0 = Math.min(plotX0, plotX1)
      const x1 = Math.max(plotX0, plotX1)
      setPlotPoints(sampleFunction(functionExpr, x0, x1, PLOT_SAMPLES))
    } catch {
      setPlotPoints([])
    }
  }

  const kitResult = useMemo(() => {
    const base = [
      { label: 'Result', value: result || '—' },
      { label: 'Stored', value: `${history.length} / ${MAX_HISTORY}` },
    ]
    if (toValue !== null) base.push({ label: 'Converted', value: truncateNumber(toValue) })
    return base
  }, [result, history.length, toValue])

  const exportOptions: ExportOption[] = [
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: () =>
        ['expression,result,at', ...history.map((h) => `"${h.expression.replace(/"/g, '""')}","${h.result}","${h.at}"`)].join('\n'),
    },
    {
      id: 'json',
      label: 'JSON',
      mimeType: 'application/json',
      extension: 'json',
      getData: () => JSON.stringify(history, null, 2),
    },
  ]

  return (
    <AppShell
      name="Scientific Calculator"
      icon="grid"
      hue="rust"
      category="Apps"
      meta="v0.1.0"
      status="Live"
      side={
        <Stack>
          <div className="lc-mono lc-faint">Calc · Convert · Plot</div>
          <div className="lc-mono lc-faint">{history.length} recorded</div>
        </Stack>
      }
    >
      <div role="tablist" aria-label="Scientific Calculator views">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`lc-tab${tab === item ? ' active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <CalculatorKit
        title="Kit summary"
        inputs={[
          {
            id: 'demo',
            label: 'Demo base',
            min: 0,
            max: 100,
            step: 1,
            defaultValue: 42,
          },
        ]}
        compute={(values) => ({
          summary: [
            { label: 'Demo squared', value: formatResult(values.demo * values.demo) },
            ...kitResult,
          ],
          breakdown: [
            { label: 'History items', value: String(history.length) },
            { label: 'Last result', value: result || '—' },
          ],
        })}
      />

      {tab === 'Calc' && (
        <Stack>
          <Card title="Calculate" mono="CALC">
            <FieldInput
              label="Expression"
              value={expression}
              placeholder="e.g. 2+3*4 or sin(90)"
              error={error}
              onChange={(value) => {
                setExpression(value)
                setError(null)
                if (value === '') {
                  setResult('')
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitExpression(expression)
                }
              }}
            />
            <MonoLabel sm faint>
              Supports +, -, *, /, ^, sin, cos, tan, log, sqrt, pi, e
            </MonoLabel>
            <Spread>
              <Button kind="primary" onClick={() => commitExpression(expression)}>
                Evaluate
              </Button>
              <Button kind="ghost" onClick={() => void copy(result)}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Spread>
            <Divider />
            <TextInput label="Result" value={result} placeholder="—" onChange={() => {}} />
          </Card>

          <Card title="History" mono="LOG" flush>
            {history.length === 0 ? (
              <div style={{ padding: 'calc(16px * var(--sf))' }}>
                <MonoLabel faint>No history yet</MonoLabel>
              </div>
            ) : (
              <Spread>
                <ul aria-label="Recent calculations">
                  {history.map((h) => (
                    <li key={h.id} role="listitem" style={{ padding: 'calc(8px * var(--sf)) 0' }}>
                      <div className="lc-mono">
                        {h.expression} = {h.result}
                      </div>
                      <MonoLabel sm faint>
                        {new Date(h.at).toLocaleString()}
                      </MonoLabel>
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(10px * var(--sf))' }}>
                  <Button kind="ghost" onClick={handleClearHistory}>
                    Clear
                  </Button>
                  <ExportMenu options={exportOptions} fileName="scientific-calculator-history" ariaLabel="Export history" />
                </div>
              </Spread>
            )}
          </Card>
        </Stack>
      )}

      {tab === 'Convert' && (
        <Stack>
          <Card title="Unit conversion" mono="CONVERT">
            <FormGrid>
              <LabeledSelect label="Category" value={category} options={Object.keys(CATEGORY_OPTIONS)} onChange={handleSelectCategory} />
              <TextInput
                label="From"
                value={fromValue === null ? '' : String(fromValue)}
                inputMode="decimal"
                placeholder="0"
                onChange={(value) => {
                  if (value === '') {
                    setFromValue(null)
                  } else {
                    const parsed = Number(value)
                    if (Number.isFinite(parsed)) setFromValue(parsed)
                  }
                }}
              />
              <LabeledSelect label="From Unit" value={fromUnit} options={units} onChange={setFromUnit} />
              <LabeledSelect label="To Unit" value={toUnit} options={units} onChange={setToUnit} />
            </FormGrid>
            <Divider />
            <TextInput label="To" value={toValue === null ? '' : truncateNumber(toValue)} placeholder="—" onChange={() => {}} />
          </Card>
        </Stack>
      )}

      {tab === 'Plot' && (
        <Stack>
          <Card title="Plot" mono="PLOT">
            <FormGrid>
              <TextInput
                label="Function"
                value={functionExpr}
                placeholder="f(x), e.g. x^2"
                onChange={setFunctionExpr}
              />
              <TextInput
                label="X min"
                value={String(plotX0)}
                inputMode="decimal"
                onChange={(value) => {
                  const parsed = Number(value)
                  if (Number.isFinite(parsed)) setPlotX0(parsed)
                }}
              />
              <TextInput
                label="X max"
                value={String(plotX1)}
                inputMode="decimal"
                onChange={(value) => {
                  const parsed = Number(value)
                  if (Number.isFinite(parsed)) setPlotX1(parsed)
                }}
              />
            </FormGrid>
            <Spread>
              <Button kind="primary" onClick={handlePlot}>
                Plot
              </Button>
              <Button kind="ghost" onClick={() => void copy(functionExpr)}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Spread>
          </Card>

          <Card title="Chart" mono="RENDER" flush>
            {plotPoints.length > 0 ? (
              <Chart
                data={chartData}
                type="line"
                title={`f(x) over [${Math.min(plotX0, plotX1)}, ${Math.max(plotX0, plotX1)}]`}
                ariaLabel={`Plot of ${functionExpr}`}
              />
            ) : (
              <div style={{ padding: 'calc(20px * var(--sf))' }}>
                <MonoLabel faint>No plot yet — enter a function and press Plot.</MonoLabel>
              </div>
            )}
          </Card>
        </Stack>
      )}
    </AppShell>
  )
}
