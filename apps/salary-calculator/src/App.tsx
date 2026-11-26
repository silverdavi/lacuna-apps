import { useState } from 'react'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Chip,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Table,
  TextInput,
} from '@lacuna/ui'
import { format, sub, toMinorUnits } from '@lacuna/money'
import { useLocalRecord } from '@lacuna/use-local-record'

const DEDUCTION_FIELDS = [
  { id: 'federal', label: 'Federal Tax' },
  { id: 'state', label: 'State Tax' },
  { id: 'other', label: 'Other Deductions' },
] as const

type DeductionId = (typeof DEDUCTION_FIELDS)[number]['id']

interface Inputs {
  gross: string
  federal: string
  state: string
  other: string
}

interface StoredRecord {
  inputs: Inputs
  computed: boolean
}

const EMPTY_INPUTS: Inputs = { gross: '', federal: '', state: '', other: '' }

const DEFAULT_RECORD: StoredRecord = {
  inputs: EMPTY_INPUTS,
  computed: false,
}

function toMinor(text: string): number {
  const n = Number(text)
  if (!Number.isFinite(n)) return 0
  return Math.round(toMinorUnits(n))
}

function parseAmount(text: string): number | null {
  if (text === '') return null
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parseInputs(raw: Inputs): Inputs {
  const out: Inputs = { ...raw }
  for (const field of ['gross', 'federal', 'state', 'other'] as const) {
    const n = parseAmount(raw[field])
    out[field] = n === null ? '' : String(n)
  }
  return out
}

interface DeductionRow {
  id: DeductionId
  label: string
  minor: number
}

interface Result {
  grossMinor: number
  rows: DeductionRow[]
  netMinor: number
}

function computeResult(inputs: Inputs): Result {
  const grossMinor = toMinor(inputs.gross)
  const rows: DeductionRow[] = []
  let total = 0
  for (const field of DEDUCTION_FIELDS) {
    const provided = toMinor(inputs[field.id])
    let minor: number
    if (provided > 0) {
      minor = provided
    } else if (field.id === 'federal' && grossMinor > 0) {
      minor = Math.round(grossMinor * 0.25)
    } else {
      minor = 0
    }
    if (minor > 0) {
      rows.push({ id: field.id, label: field.label, minor })
      total += minor
    }
  }
  const netMinor = sub(grossMinor, total)
  return { grossMinor, rows, netMinor }
}

function buildChart(result: Result): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  if (result.netMinor > 0) data.push({ label: 'Net Pay', value: result.netMinor })
  for (const row of result.rows) data.push({ label: row.label, value: row.minor })
  return data
}

export function App() {
  const record = useLocalRecord<StoredRecord>({
    key: 'lacuna.salary-calculator',
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })
  const inputs = record.value.inputs
  const computed = record.value.computed
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function setInput(field: keyof Inputs) {
    return (text: string) => {
      record.set((prev) => ({ ...prev, inputs: { ...prev.inputs, [field]: text } }))
      setError(null)
    }
  }

  function calculate() {
    if (inputs.gross.trim() === '') {
      setError('Gross salary must be greater than 0')
      record.set((prev) => ({ ...prev, computed: false }))
      return
    }
    if (!/^\d+$/.test(inputs.gross.trim())) {
      setError('Enter a valid number')
      record.set((prev) => ({ ...prev, computed: false }))
      return
    }
    const gross = Number(inputs.gross)
    if (gross <= 0) {
      setError('Gross salary must be greater than 0')
      record.set((prev) => ({ ...prev, computed: false }))
      return
    }
    for (const field of DEDUCTION_FIELDS) {
      const text = inputs[field.id].trim()
      if (text !== '' && !/^\d+$/.test(text)) {
        setError('Enter a valid number')
        record.set((prev) => ({ ...prev, computed: false }))
        return
      }
    }
    setError(null)
    record.set((prev) => ({ ...prev, inputs: parseInputs(prev.inputs), computed: true }))
  }

  function reset() {
    record.set({ inputs: EMPTY_INPUTS, computed: false })
    setError(null)
  }

  const result = computed ? computeResult(inputs) : computeResult(EMPTY_INPUTS)
  const chartData = buildChart(result)
  const totalDeductions = result.rows.reduce((acc, row) => acc + row.minor, 0)

  async function copyResult() {
    const lines = [
      `Gross: ${format(result.grossMinor)}`,
      `Net Pay: ${format(result.netMinor)}`,
      `Total Deductions: ${format(totalDeductions)}`,
      ...result.rows.map((row) => `${row.label}: ${format(row.minor)}`),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  function exportCsv() {
    const head = ['Item', 'Amount']
    const body = [
      ['Gross Annual Salary', format(result.grossMinor)],
      ...result.rows.map((row): [string, string] => [row.label, format(row.minor)]),
      ['Net Pay', format(result.netMinor)],
    ]
    const csv = [head, ...body].map((cells) => cells.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'salary-calculation.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function exportJson() {
    const payload = {
      gross: format(result.grossMinor),
      netPay: format(result.netMinor),
      totalDeductions: format(totalDeductions),
      deductions: result.rows.map((row) => ({ label: row.label, amount: format(row.minor) })),
      currency: 'USD',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'salary-calculation.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const hasResult = computed && result.grossMinor > 0

  return (
    <AppShell
      name="Salary Calculator"
      icon="payroll"
      hue="gold"
      category="Productivity"
      meta={hasResult ? 'Result ready' : 'No result yet'}
      status={hasResult ? 'Last calculation kept on this device' : 'Local · no network'}
      side={
        <Rail
          title="Salary Calculator"
          note="Gross pay minus deductions"
          chips={['Net pay', 'Breakdown', 'Export', 'Works offline']}
        >
          <List label="How to use">
            <Row title="Enter a gross salary" meta="Annual amount in USD" />
            <Row title="Add deductions" meta="Leave blank to estimate Federal at 25%" />
            <Row title="Press Calculate" meta="Kept on this device" />
          </List>
        </Rail>
      }
    >
      <Card
        mono="Inputs"
        title="Salary details"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="ghost" onClick={reset}>Reset</Button>
          </div>
        }
      >
        <FormGrid>
          <TextInput
            label="Gross Annual Salary"
            value={inputs.gross}
            onChange={setInput('gross')}
            inputMode="numeric"
            placeholder="50000"
            error={error}
          />
          {DEDUCTION_FIELDS.map((field) => (
            <TextInput
              key={field.id}
              label={field.label}
              value={inputs[field.id]}
              onChange={setInput(field.id)}
              inputMode="numeric"
              placeholder="0"
            />
          ))}
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={calculate}>
            Calculate
          </Button>
        </Actions>
      </Card>

      <Card
        mono="Result"
        title="Result"
        actions={
          hasResult ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="secondary" onClick={copyResult}>{copied ? 'Copied' : 'Copy'}</Button>
              <Button kind="secondary" onClick={exportCsv}>Export CSV</Button>
              <Button kind="secondary" onClick={exportJson}>Export JSON</Button>
            </div>
          ) : undefined
        }
      >
        <KpiRow>
          <Kpi value={`Net Pay: ${format(result.netMinor)}`} label="Annual net pay" accent />
          <Kpi value={format(result.grossMinor)} label="Gross" />
          <Kpi value={format(totalDeductions)} label="Deductions" />
        </KpiRow>
        <div style={{ marginTop: 12 }}>
          <Table
            label="Deduction breakdown"
            columns={[
              { key: 'deduction', label: 'Deduction' },
              { key: 'amount', label: 'Amount', num: true },
            ]}
            rows={result.rows.map((row) => ({
              cells: { deduction: row.label, amount: format(row.minor) },
            }))}
            foot={
              result.rows.length > 0
                ? { deduction: 'Total', amount: format(totalDeductions) }
                : undefined
            }
            empty="No deductions"
          />
        </div>
      </Card>

      <Card mono="Breakdown" title="Pay breakdown">
        <Table
          label="Pay breakdown"
          columns={[
            { key: 'item', label: 'Item' },
            { key: 'amount', label: 'Amount', num: true },
          ]}
          rows={[
            { cells: { item: 'Gross Annual Salary', amount: format(result.grossMinor) } },
            ...result.rows.map((row) => ({
              cells: { item: row.label, amount: format(row.minor) },
            })),
            { cells: { item: 'Net Pay', amount: format(result.netMinor) }, hot: true },
          ]}
          empty="Enter a gross salary and press Calculate."
        />
      </Card>

      <Card mono="Composition" title="Pay composition">
        {chartData.length > 0 ? (
          <>
            <Chart type="donut" data={chartData} title="Pay composition" width={280} height={200} />
            <ul style={{ listStyle: 'none', margin: 'calc(12px * var(--sf)) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chartData.map((point, i) => (
                <li key={point.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: i === 0 ? 'var(--ink)' : 'var(--mid)', display: 'inline-block' }} />
                  <span>{point.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-60)' }}>{format(point.value)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState title="No pay composition yet" detail="Enter a gross salary and press Calculate." />
        )}
      </Card>

      <Card mono="Notes" title="About this calculation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip>Estimates Federal Tax at 25% when blank</Chip>
            <Chip>Amounts in USD</Chip>
            <Chip>Runs fully offline</Chip>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>
            Not tax advice. Actual withholding varies by jurisdiction and filing status.
          </div>
        </div>
      </Card>
    </AppShell>
  )
}
