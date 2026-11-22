// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import type { ChartDataPoint } from '@lacuna/chart'
import { NumberInput } from '@lacuna/number-input'
import { useLocalRecord } from '@lacuna/use-local-record'
import { useClipboard } from '@lacuna/use-clipboard'

// ---------------------------------------------------------------- evaluation
type HistoryEntry = { id: string; expr: string; result: string; at: number }

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'undefined'
  if (Object.is(value, -0)) return '0'
  const abs = Math.abs(value)
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return value.toExponential(6)
  const rounded = Math.round(value * 1e9) / 1e9
  return String(rounded)
}

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let i = 0
  const s = input.replace(/\s+/g, '')
  while (i < s.length) {
    const ch = s[i]
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      tokens.push(s.slice(i, j))
      i = j
      continue
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++
      tokens.push(s.slice(i, j).toLowerCase())
      i = j
      continue
    }
    tokens.push(ch)
    i++
  }
  return tokens
}

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  asin: (x) => (Math.asin(x) * 180) / Math.PI,
  acos: (x) => (Math.acos(x) * 180) / Math.PI,
  atan: (x) => (Math.atan(x) * 180) / Math.PI,
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  exp: (x) => Math.exp(x),
}

function evaluate(input: string): number {
  const tokens = tokenize(input)
  let pos = 0

  function peek(): string | undefined {
    return tokens[pos]
  }

  function next(): string | undefined {
    const t = tokens[pos]
    pos++
    return t
  }

  function parsePrimary(): number {
    const t = next()
    if (t === undefined) throw new Error('Unexpected end of expression')
    if (t === '(') {
      const v = parseExpr()
      const close = next()
      if (close !== ')') throw new Error('Expected )')
      return v
    }
    if (t === '-') {
      return -parsePrimary()
    }
    if (/^[0-9.]+$/.test(t)) {
      return parseFloat(t)
    }
    if (FUNCTIONS[t]) {
      const open = next()
      if (open !== '(') throw new Error(`Expected ( after ${t}`)
      const arg = parseExpr()
      const close = next()
      if (close !== ')') throw new Error('Expected )')
      return FUNCTIONS[t](arg)
    }
    throw new Error(`Unexpected token ${t}`)
  }

  function parsePower(): number {
    const base = parsePrimary()
    if (peek() === '^') {
      next()
      const exponent = parsePower()
      return Math.pow(base, exponent)
    }
    return base
  }

  function parseTerm(): number {
    let value = parsePower()
    while (peek() === '*' || peek() === '/') {
      const op = next()
      const rhs = parsePower()
      if (op === '*') value = value * rhs
      else value = value / rhs
    }
    return value
  }

  function parseExpr(): number {
    let value = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = next()
      const rhs = parseTerm()
      if (op === '+') value = value + rhs
      else value = value - rhs
    }
    return value
  }

  const result = parseExpr()
  if (pos !== tokens.length) throw new Error('Unexpected trailing tokens')
  return result
}

// ---------------------------------------------------------------- conversions
type Unit = { id: string; label: string; toBase: number }
type Category = { id: string; label: string; units: Unit[] }

const CATEGORIES: Category[] = [
  {
    id: 'length',
    label: 'Length',
    units: [
      { id: 'mm', label: 'Millimeters', toBase: 0.001 },
      { id: 'cm', label: 'Centimeters', toBase: 0.01 },
      { id: 'm', label: 'Meters', toBase: 1 },
      { id: 'km', label: 'Kilometers', toBase: 1000 },
      { id: 'in', label: 'Inches', toBase: 0.0254 },
      { id: 'ft', label: 'Feet', toBase: 0.3048 },
      { id: 'yd', label: 'Yards', toBase: 0.9144 },
      { id: 'mi', label: 'Miles', toBase: 1609.344 },
    ],
  },
  {
    id: 'mass',
    label: 'Mass',
    units: [
      { id: 'mg', label: 'Milligrams', toBase: 0.000001 },
      { id: 'g', label: 'Grams', toBase: 0.001 },
      { id: 'kg', label: 'Kilograms', toBase: 1 },
      { id: 'tonne', label: 'Tonnes', toBase: 1000 },
      { id: 'oz', label: 'Ounces', toBase: 0.028349523125 },
      { id: 'lb', label: 'Pounds', toBase: 0.45359237 },
      { id: 'ston', label: 'Stones', toBase: 6.35029318 },
    ],
  },
  {
    id: 'speed',
    label: 'Speed',
    units: [
      { id: 'ms', label: 'Meters per second', toBase: 1 },
      { id: 'kmh', label: 'Kilometers per hour', toBase: 0.2777777778 },
      { id: 'mph', label: 'Miles per hour', toBase: 0.44704 },
      { id: 'kn', label: 'Knots', toBase: 0.5144444444 },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    units: [
      { id: 'c', label: 'Celsius', toBase: 1 },
      { id: 'f', label: 'Fahrenheit', toBase: 1 },
      { id: 'k', label: 'Kelvin', toBase: 1 },
    ],
  },
]

function toBase(categoryId: string, unitId: string, value: number): number {
  if (categoryId === 'temperature') {
    if (unitId === 'c') return value
    if (unitId === 'f') return ((value - 32) * 5) / 9
    if (unitId === 'k') return value - 273.15
    return value
  }
  const category = CATEGORIES.find((c) => c.id === categoryId)
  const unit = category?.units.find((u) => u.id === unitId)
  if (!unit) return value
  return value * unit.toBase
}

function fromBase(categoryId: string, unitId: string, base: number): number {
  if (categoryId === 'temperature') {
    if (unitId === 'c') return base
    if (unitId === 'f') return (base * 9) / 5 + 32
    if (unitId === 'k') return base + 273.15
    return base
  }
  const category = CATEGORIES.find((c) => c.id === categoryId)
  const unit = category?.units.find((u) => u.id === unitId)
  if (!unit) return base
  return base / unit.toBase
}

// ---------------------------------------------------------------- plot
function parseFunction(input: string): (x: number) => number {
  const tokens = tokenize(input)
  return (x: number): number => {
    let pos = 0
    const peek = () => tokens[pos]
    const next = () => {
      const t = tokens[pos]
      pos++
      return t
    }
    function parsePrimary(): number {
      const t = next()
      if (t === undefined) throw new Error('Unexpected end')
      if (t === '(') {
        const v = parseExpr()
        const close = next()
        if (close !== ')') throw new Error('Expected )')
        return v
      }
      if (t === '-') return -parsePrimary()
      if (/^[0-9.]+$/.test(t)) return parseFloat(t)
      if (t === 'x') return x
      if (FUNCTIONS[t]) {
        const open = next()
        if (open !== '(') throw new Error('Expected (')
        const arg = parseExpr()
        const close = next()
        if (close !== ')') throw new Error('Expected )')
        return FUNCTIONS[t](arg)
      }
      throw new Error(`Unexpected ${t}`)
    }
    function parsePower(): number {
      const base = parsePrimary()
      if (peek() === '^') {
        next()
        return Math.pow(base, parsePower())
      }
      return base
    }
    function parseTerm(): number {
      let value = parsePower()
      while (peek() === '*' || peek() === '/') {
        const op = next()
        const rhs = parsePower()
        if (op === '*') value = value * rhs
        else value = value / rhs
      }
      return value
    }
    function parseExpr(): number {
      let value = parseTerm()
      while (peek() === '+' || peek() === '-') {
        const op = next()
        const rhs = parseTerm()
        if (op === '+') value = value + rhs
        else value = value - rhs
      }
      return value
    }
    const result = parseExpr()
    if (pos < tokens.length) throw new Error('Unexpected trailing tokens')
    return result
  }
}

function sampleFunction(fn: (x: number) => number, from: number, to: number, step: number): ChartDataPoint[] {
  const points: ChartDataPoint[] = []
  for (let x = from; x <= to + step / 2; x += step) {
    const y = fn(x)
    if (Number.isFinite(y)) {
      points.push({ label: formatNumber(Math.round(x * 1e9) / 1e9), value: y })
    }
  }
  return points
}

// ---------------------------------------------------------------- tabs
function TabButtons({ items, active, onSelect }: { items: string[]; active: string; onSelect: (v: string) => void }) {
  return (
    <div className="lc-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === active}
          className={item === active ? 'lc-tab active' : 'lc-tab'}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- result field
function ResultField({ label, value }: { label: string; value: string }) {
  const [id] = useState(() => `result-field-${label.toLowerCase().replace(/\s+/g, '-')}`)
  return (
    <div className="lc-field">
      <label className="lc-field-label" htmlFor={id}>{label}</label>
      <input className="lc-input" id={id} readOnly value={value} />
    </div>
  )
}

// ---------------------------------------------------------------- unit select
function UnitSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [id] = useState(() => `select-${label.toLowerCase().replace(/\s+/g, '-')}`)
  return (
    <div className="lc-field">
      <label className="lc-field-label" htmlFor={id}>{label}</label>
      <select className="lc-input" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ---------------------------------------------------------------- app
export function App() {
  const [tab, setTab] = useState<string>('Calc')

  return (
    <AppShell name="Scientific Calculator" icon="grid" hue="rust" category="Productivity" meta={`${tab} view`}>
      <Stack>
        <TabButtons items={['Calc', 'Convert', 'Plot']} active={tab} onSelect={setTab} />
        {tab === 'Calc' && <CalcTab />}
        {tab === 'Convert' && <ConvertTab />}
        {tab === 'Plot' && <PlotTab />}
      </Stack>
    </AppShell>
  )
}

// ---------------------------------------------------------------- calc tab
function CalcTab() {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { value: history, set: setHistory } = useLocalRecord<HistoryEntry[]>({
    key: 'scientific-calculator.history',
    version: 1,
    defaultValue: [],
  })
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  function evaluateNow() {
    const expr = expression.trim()
    if (!expr) return
    try {
      const value = evaluate(expr)
      const text = formatNumber(value)
      setResult(text)
      setError(null)
      setHistory((prev) => [
        { id: `${Date.now()}-${Math.random()}`, expr, result: text, at: Date.now() },
        ...prev,
      ])
    } catch (err) {
      setResult('')
      setError(err instanceof Error ? err.message : 'Invalid expression')
    }
  }

  function clearHistory() {
    setHistory([])
  }

  function handleWrapperKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault()
      evaluateNow()
    }
  }

  return (
    <Stack>
      <Card mono="Expression" title="Calculate">
        <div ref={wrapperRef} onKeyDown={handleWrapperKeyDown}>
          <FormGrid>
            <TextInput label="Expression" value={expression} onChange={setExpression} placeholder="2+3*4 or sin(90)" error={error} />
          </FormGrid>
          <ResultField label="Result" value={result} />
        </div>
        <Actions>
          <Button kind="ink" onClick={evaluateNow}>
            Evaluate
          </Button>
          <Button
            onClick={() => {
              if (result) void copy(result)
            }}
            disabled={!result}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </Actions>
      </Card>

      <Card mono={`${history.length} entries`} title="History">
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No history yet"
            detail="Evaluate an expression to record it here."
            actionLabel="Evaluate an expression"
            onAction={evaluateNow}
          />
        ) : (
          <>
            <List label="History">
              {history.map((entry) => (
                <Row
                  key={entry.id}
                  title={`${entry.expr} = ${entry.result}`}
                  value={new Date(entry.at).toLocaleTimeString()}
                />
              ))}
            </List>
            <Actions>
              <Button kind="ghost" onClick={clearHistory}>
                Clear
              </Button>
            </Actions>
          </>
        )}
      </Card>
    </Stack>
  )
}

// ---------------------------------------------------------------- convert tab
function ConvertTab() {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id)
  const [fromValue, setFromValue] = useState('')
  const [fromUnit, setFromUnit] = useState(CATEGORIES[0].units[2].id)
  const [toUnit, setToUnit] = useState(CATEGORIES[0].units[5].id)

  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]

  const toValue = useMemo(() => {
    const trimmed = fromValue.trim()
    if (trimmed === '') return ''
    const num = parseFloat(trimmed)
    if (Number.isNaN(num)) return ''
    const base = toBase(categoryId, fromUnit, num)
    const converted = fromBase(categoryId, toUnit, base)
    return formatNumber(converted)
  }, [categoryId, fromUnit, toUnit, fromValue])

  function handleCategoryChange(id: string) {
    setCategoryId(id)
    const cat = CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
    setFromUnit(cat.units[0].id)
    setToUnit(cat.units[1].id)
  }

  return (
    <Stack>
      <Card mono="Converter" title="Unit Conversion">
        <FormGrid>
          <UnitSelect
            label="Category"
            value={categoryId}
            onChange={handleCategoryChange}
            options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          />
          <TextInput
            label="From"
            value={fromValue}
            onChange={setFromValue}
            inputMode="decimal"
            placeholder="100"
          />
          <UnitSelect
            label="From Unit"
            value={fromUnit}
            onChange={setFromUnit}
            options={category.units.map((u) => ({ value: u.id, label: u.label }))}
          />
          <UnitSelect
            label="To Unit"
            value={toUnit}
            onChange={setToUnit}
            options={category.units.map((u) => ({ value: u.id, label: u.label }))}
          />
          <ResultField label="To" value={toValue} />
        </FormGrid>
      </Card>
    </Stack>
  )
}

// ---------------------------------------------------------------- plot tab
function PlotTab() {
  const [fnInput, setFnInput] = useState('')
  const [fromX, setFromX] = useState<number | null>(-5)
  const [toX, setToX] = useState<number | null>(5)
  const [plotResult, setPlotResult] = useState<ChartDataPoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function plot() {
    const expr = fnInput.trim()
    if (!expr) return
    const from = fromX ?? -5
    const to = toX ?? 5
    try {
      const fn = parseFunction(expr)
      const points = sampleFunction(fn, from, to, 1)
      if (points.length === 0) {
        setError('No valid points in the sampled range')
        setPlotResult(null)
        return
      }
      setPlotResult(points)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid function')
      setPlotResult(null)
    }
  }

  return (
    <Stack>
      <Card mono="Function" title="Plot">
        <FormGrid>
          <TextInput label="Function" value={fnInput} onChange={setFnInput} placeholder="x^2 or sin(x)" error={error} />
          <NumberInput label="From X" value={fromX} onChange={setFromX} min={-100} max={100} />
          <NumberInput label="To X" value={toX} onChange={setToX} min={-100} max={100} />
        </FormGrid>
        <Actions>
          <Button kind="ink" onClick={plot}>
            Plot
          </Button>
        </Actions>
      </Card>

      {plotResult && plotResult.length > 0 ? (
        <Card mono="Chart" title="Result">
          <Chart
            type="line"
            data={plotResult}
            title={fnInput}
            ariaLabel={`Plot of ${fnInput}`}
            width={480}
            height={240}
          />
          <div className="lc-body-sm">Sampled from x = {fromX ?? -5} to x = {toX ?? 5}. Max value: {Math.max(...plotResult.map((p) => p.value))}</div>
        </Card>
      ) : null}
    </Stack>
  )
}
