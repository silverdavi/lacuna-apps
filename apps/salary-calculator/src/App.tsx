import { useState } from 'react'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
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

  const result = computed ? computeResult(inputs) : computeResult(EMPTY_INPUTS)
  const chartData = buildChart(result)

  return (
    <AppShell
      name="Salary Calculator"
      icon="payroll"
      hue="gold"
      category="Productivity"
      status="Local · no network"
      side={
        <Rail
          title="Salary Calculator"
          note="Gross pay minus deductions"
          chips={['Net pay', 'Breakdown', 'Works offline']}
        />
      }
    >
      <Card mono="Inputs" title="Salary details">
        <FormGrid>
          <TextInput
            label="Gross Annual Salary"
            value={inputs.gross}
            onChange={setInput('gross')}
            inputMode="numeric"
            placeholder="50000"
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
        {error !== null && <p role="alert">{error}</p>}
      </Card>

      <Card mono="Result" title="Result">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ font: '600 calc(20px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>
            Net Pay: {format(result.netMinor)}
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-60)', fontSize: 'calc(13px * var(--tf))' }}>
            Gross: {format(result.grossMinor)}
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-60)', fontSize: 'calc(13px * var(--tf))' }}>
            Total Deductions: {format(result.rows.reduce((acc, row) => acc + row.minor, 0))}
          </span>
        </div>
      </Card>

      <Card mono="Breakdown" title="Deduction breakdown">
        <Table
          label="Deduction breakdown"
          columns={[
            { key: 'deduction', label: 'Deduction' },
            { key: 'amount', label: 'Amount', num: true },
          ]}
          rows={result.rows.map((row) => ({
            cells: { deduction: row.label, amount: format(row.minor) },
          }))}
          empty="No deductions"
        />
      </Card>

      <Card mono="Chart" title="Pay composition">
        {chartData.length > 0 ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chartData.map((point) => (
              <li key={point.label} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--ink)', display: 'inline-block' }} />
                <span>{point.label}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-60)' }}>{format(point.value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No pay composition yet" detail="Enter a gross salary and press Calculate." />
        )}
      </Card>
    </AppShell>
  )
}
