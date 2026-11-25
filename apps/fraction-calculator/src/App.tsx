// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useLocalRecord } from '@lacuna/use-local-record'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  compute,
  expressionString,
  formatFraction,
  host,
  normalize,
  toDecimal,
  type Fraction,
  type HistoryItem,
  type Operator,
} from './host'

const OPERATORS: Operator[] = ['+', '×', '÷']
const RESULT_TABS: ('Result' | 'Breakdown')[] = ['Result', 'Breakdown']

function tabStyle(active: boolean): CSSProperties {
  return {
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    background: active ? 'var(--paper-deep)' : 'transparent',
    border: 'none',
    borderRadius: 'calc(8px * var(--sf))',
    padding: 'calc(6px * var(--sf)) calc(14px * var(--sf))',
    cursor: 'pointer',
  }
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div className="lc-field frac-result-field" aria-label={label}>
      <span className="lc-field-label">{label}</span>
      <span className={value ? 'lc-input filled' : 'lc-input'}>
        {value}
      </span>
    </div>
  )
}

interface Fields {
  n1: number
  d1: number
  n2: number
  d2: number
}

const DEFAULT_FIELDS: Fields = { n1: 1, d1: 2, n2: 1, d2: 3 }

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<{ operator: Operator; fields: Fields }>({
    key: 'lacuna.fraction-calculator',
    version: 1,
    defaultValue: { operator: '+', fields: DEFAULT_FIELDS },
  })

  const [operator, setOperator] = useState<Operator>(record.operator)
  const [n1, setN1] = useState(String(record.fields.n1))
  const [d1, setD1] = useState(String(record.fields.d1))
  const [n2, setN2] = useState(String(record.fields.n2))
  const [d2, setD2] = useState(String(record.fields.d2))

  const [result, setResult] = useState<Fraction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'Result' | 'Breakdown'>('Result')
  const [history, setHistory] = useState<HistoryItem[]>(() => host.listHistory())

  const clipboard = useClipboard({ timeoutMs: 1500 })

  const persist = (op: Operator, f: Fields) => setRecord({ operator: op, fields: f })

  const parseOperand = (n: string, d: string, label: string): Fraction => {
    const num = Number(n)
    const den = Number(d)
    if (!Number.isFinite(num) || !Number.isFinite(den)) {
      throw new Error(`${label} is not a valid number`)
    }
    if (den === 0) {
      throw new Error('Denominator cannot be zero')
    }
    return normalize(num, den)
  }

  const calculate = () => {
    try {
      const a = parseOperand(n1, d1, 'First fraction')
      const b = parseOperand(n2, d2, 'Second fraction')
      setResult(compute(a, operator, b))
      setError(null)
      setTab('Result')
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const save = () => {
    if (result == null) return
    const a = parseOperand(n1, d1, 'First fraction')
    const b = parseOperand(n2, d2, 'Second fraction')
    host.addHistory(expressionString(a, operator, b), formatFraction(result))
    setHistory(host.listHistory())
  }

  const removeEntry = (id: string) => {
    host.removeHistory(id)
    setHistory(host.listHistory())
  }

  const clearHistory = () => {
    host.clearHistory()
    setHistory([])
  }

  const copyResult = () => {
    if (result != null) void clipboard.copy(formatFraction(result))
  }

  const onOperatorChange = (op: Operator) => {
    setOperator(op)
    persist(op, { n1: Number(n1), d1: Number(d1), n2: Number(n2), d2: Number(d2) })
  }

  const onField = (key: keyof Fields, value: string) => {
    if (key === 'n1') setN1(value)
    else if (key === 'd1') setD1(value)
    else if (key === 'n2') setN2(value)
    else setD2(value)
    persist(operator, {
      n1: key === 'n1' ? Number(value) : Number(n1),
      d1: key === 'd1' ? Number(value) : Number(d1),
      n2: key === 'n2' ? Number(value) : Number(n2),
      d2: key === 'd2' ? Number(value) : Number(d2),
    })
  }

  const decimal = result != null ? toDecimal(result) : null
  const resultLabel = result != null ? formatFraction(result) : '—'

  const breakdownRows = (): { cells: Record<string, ReactNode>; hot?: boolean }[] => {
    if (result == null) return []
    const a = parseOperand(n1, d1, 'First fraction')
    const b = parseOperand(n2, d2, 'Second fraction')
    const rows: { cells: Record<string, ReactNode>; hot?: boolean }[] = []
    const step = (label: string, value: string, hot = false) =>
      rows.push({ cells: { step: `${label}: ${value}` }, hot })
    if (operator === '+') {
      const denom = a.d * b.d
      step('First term', `${a.n}/${a.d}`)
      step('Second term', `${b.n}/${b.d}`)
      step('Common denominator', String(denom))
      step('Converted first term', `${(a.n * b.d)}/${denom}`)
      step('Converted second term', `${(b.n * a.d)}/${denom}`)
      step('Sum of numerators', String(a.n * b.d + b.n * a.d))
      step('Result before reducing', `${a.n * b.d + b.n * a.d}/${denom}`, true)
    } else if (operator === '×') {
      step('First term', `${a.n}/${a.d}`)
      step('Second term', `${b.n}/${b.d}`)
      step('Product of numerators', String(a.n * b.n))
      step('Product of denominators', String(a.d * b.d))
      step('Result before reducing', `${a.n * b.n}/${a.d * b.d}`, true)
    } else {
      step('First term', `${a.n}/${a.d}`)
      step('Reciprocal of second term', `${b.d}/${b.n}`)
      step('Product of numerators', String(a.n * b.d))
      step('Product of denominators', String(a.d * b.n))
      step('Result before reducing', `${a.n * b.d}/${a.d * b.n}`, true)
    }
    step('Final result', formatFraction(result))
    return rows
  }

  return (
    <AppShell
      name="Fraction Calculator"
      icon="finance"
      hue="green"
      category="Productivity"
      meta={history.length > 0 ? `${history.length} saved` : 'Fresh session'}
      status={clipboard.copied ? 'Result copied' : undefined}
      side={
        <Rail
          title="History"
          note={history.length > 0 ? `${history.length} entries` : 'Nothing saved yet'}
          chips={['Add and divide fractions', 'See the decimal', 'Copy results', 'Keep a log']}
        >
          {history.length === 0 ? (
            <EmptyState
              title="No history"
              detail="Calculate a fraction and press Save to keep it here."
              actionLabel="Start calculating"
              onAction={calculate}
            />
          ) : (
            <Stack>
              <List label="History">
                {history.map((h) => (
                  <Row
                    key={h.id}
                    title={`${h.expression} = ${h.result}`}
                    meta="saved"
                    action={
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${h.expression}`}
                        style={{ padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))' }}
                        onClick={() => removeEntry(h.id)}
                      >
                        Delete
                      </Button>
                    }
                  />
                ))}
              </List>
              <Button kind="ghost" onClick={clearHistory}>
                Clear history
              </Button>
            </Stack>
          )}
        </Rail>
      }
    >
      <Card title="Fractions" mono="Input">
        <FormGrid>
          <Select
            label="Operator"
            value={operator}
            onChange={(v) => onOperatorChange(v as Operator)}
            options={OPERATORS}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'calc(12px * var(--sf))' }}>
            <TextInput label="Numerator 1" value={n1} onChange={(v) => onField('n1', v)} inputMode="decimal" />
            <TextInput label="Denominator 1" value={d1} onChange={(v) => onField('d1', v)} inputMode="decimal" />
            <TextInput label="Numerator 2" value={n2} onChange={(v) => onField('n2', v)} inputMode="decimal" />
            <TextInput label="Denominator 2" value={d2} onChange={(v) => onField('d2', v)} inputMode="decimal" />
          </div>
          <Stack style={{ gap: 'calc(12px * var(--sf))' }}>
            <PrimaryButton onClick={calculate}>Calculate</PrimaryButton>
            <PrimaryButton onClick={save} disabled={result == null}>Save</PrimaryButton>
          </Stack>
        </FormGrid>
      </Card>

      <Card title="Result" mono="Output">
        <div className="frac-tabbar" role="tablist">
          {RESULT_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              style={tabStyle(tab === t)}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'Result' ? (
          <Stack style={{ gap: 'calc(12px * var(--sf))' }}>
            <ResultField label="Result" value={resultLabel} />
            <ResultField label="Decimal" value={decimal != null ? String(decimal) : '—'} />
            <Button kind="secondary" onClick={copyResult}>
              {clipboard.copied ? 'Copied' : 'Copy result'}
            </Button>
          </Stack>
        ) : (
            <Table
              label="Breakdown"
              columns={[{ key: 'step', label: 'Breakdown' }]}
              rows={breakdownRows()}
              empty="Press Calculate to see the steps."
            />
        )}
      </Card>

      {error != null ? (
        <ErrorState title={error} detail="Check the inputs and press Calculate again." />
      ) : null}
    </AppShell>
  )
}
