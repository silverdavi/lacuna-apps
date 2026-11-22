import { useState } from 'react'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu } from '@lacuna/export-menu'
import { format, toMinorUnits } from '@lacuna/money'
import {
  AppShell,
  Body,
  Button,
  Card,
  FormGrid,
  Kpi,
  KpiRow,
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

type FilingStatus = 'Single' | 'Married filing jointly' | 'Married filing separately' | 'Head of household'

const STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: 'Single', label: 'Single' },
  { value: 'Married filing jointly', label: 'Married filing jointly' },
  { value: 'Married filing separately', label: 'Married filing separately' },
  { value: 'Head of household', label: 'Head of household' },
]

interface Tier {
  cap: number | null
  rate: number
}

const DEDUCTION: Record<FilingStatus, number> = {
  Single: 10000,
  'Married filing jointly': 10000,
  'Married filing separately': 10000,
  'Head of household': 15000,
}

const TIERS: Record<FilingStatus, Tier[]> = {
  Single: [
    { cap: 40000, rate: 0.1 },
    { cap: 90000, rate: 0.12 },
    { cap: 190000, rate: 0.2 },
    { cap: null, rate: 0.22 },
  ],
  'Married filing jointly': [
    { cap: 40000, rate: 0.1 },
    { cap: null, rate: 0.1 },
  ],
  'Married filing separately': [
    { cap: 40000, rate: 0.088 },
    { cap: null, rate: 0.12 },
  ],
  'Head of household': [
    { cap: 50000, rate: 0.088 },
    { cap: 52500, rate: 0.12 },
    { cap: null, rate: 0.205 },
  ],
}

interface BracketRow {
  rate: number
  cap: number | null
  amountMinor: number
}

function computeBrackets(gross: number, status: FilingStatus): BracketRow[] {
  const taxable = Math.max(0, gross - DEDUCTION[status])
  let start = 0
  const rows: BracketRow[] = []
  for (const tier of TIERS[status]) {
    if (taxable <= start) break
    const end = tier.cap === null ? taxable : Math.min(taxable, tier.cap)
    if (end > start) {
      const amountMinor = toMinorUnits((end - start) * tier.rate)
      if (amountMinor > 0) {
        rows.push({ rate: tier.rate, cap: tier.cap, amountMinor })
      }
    }
    start = tier.cap === null ? Infinity : tier.cap
  }
  return rows
}

interface Result {
  gross: number
  taxable: number
  taxMinor: number
  effectivePct: number
  rows: BracketRow[]
}

function computeResult(gross: number, status: FilingStatus): Result {
  const rows = computeBrackets(gross, status)
  const taxMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0)
  const taxable = Math.max(0, gross - DEDUCTION[status])
  const effectivePct = taxable > 0 ? (taxMinor / 100) / taxable * 100 : 0
  return { gross, taxable, taxMinor, effectivePct, rows }
}

function composition(result: Result): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  if (result.taxMinor > 0) data.push({ label: 'Federal tax', value: result.taxMinor })
  const netMinor = toMinorUnits(result.gross) - result.taxMinor
  if (netMinor > 0) data.push({ label: 'Take-home', value: netMinor })
  return data
}

function resultCopy(result: Result, status: FilingStatus): string {
  const lines = [
    `Gross income: ${format(toMinorUnits(result.gross))}`,
    `Filing status: ${status}`,
    `Taxable income: ${format(toMinorUnits(result.taxable))}`,
    `Tax: ${format(result.taxMinor)}`,
    `Effective rate: ${result.effectivePct.toFixed(2)}%`,
  ]
  if (result.rows.length > 0) {
    lines.push('', 'Bracket breakdown:')
    for (const row of result.rows) {
      lines.push(`- ${Math.round(row.rate * 100)}% on ${row.cap === null ? 'income above the prior bracket' : `$${row.cap.toLocaleString('en-US')}`}: ${format(row.amountMinor)}`)
    }
  }
  return lines.join('\n')
}

function exportJson(result: Result, status: FilingStatus): string {
  return JSON.stringify(
    {
      grossIncome: result.gross,
      filingStatus: status,
      standardDeduction: DEDUCTION[status],
      taxableIncome: result.taxable,
      tax: result.taxMinor / 100,
      effectiveRate: Number(result.effectivePct.toFixed(4)),
      currency: 'USD',
      bracketBreakdown: result.rows.map((r) => ({ rate: r.rate, cap: r.cap, tax: r.amountMinor / 100 })),
    },
    null,
    2,
  )
}

interface StoredRecord {
  gross: string
  status: FilingStatus
  computed: boolean
}

const DEFAULT_RECORD: StoredRecord = { gross: '', status: 'Single', computed: false }

export function App() {
  const record = useLocalRecord<StoredRecord>({
    key: 'lacuna.tax-calculator',
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })
  const [error, setError] = useState<string | null>(null)
  const clipboard = useClipboard({ timeoutMs: 1600 })

  const grossText = record.value.gross
  const status = record.value.status
  const gross = record.value.computed && grossText.trim() !== '' ? Number(grossText) : 0
  const result = record.value.computed ? computeResult(gross, status) : computeResult(0, status)
  const hasResult = record.value.computed && gross > 0
  const chartData = composition(result)
  const summaryLabel = hasResult ? undefined : 'No calculation yet'

  function setGross(text: string) {
    record.set((prev) => ({ ...prev, gross: text, computed: false }))
    setError(null)
  }

  function setStatus(next: string) {
    record.set((prev) => ({ ...prev, status: next as FilingStatus, computed: false }))
  }

  function calculate() {
    const text = grossText.trim()
    if (text === '') {
      setError('Enter a gross income greater than 0')
      record.set((prev) => ({ ...prev, computed: false }))
      return
    }
    if (!/^\d+$/.test(text)) {
      setError('Enter a gross income greater than 0')
      record.set((prev) => ({ ...prev, computed: false }))
      return
    }
    const value = Number(text)
    if (value <= 0) {
      setError('Enter a gross income greater than 0')
      record.set((prev) => ({ ...prev, computed: false }))
      return
    }
    setError(null)
    record.set((prev) => ({ ...prev, gross: String(value), computed: true }))
  }

  function exportCsv(): string {
    const head = ['Bracket', 'Taxable span', 'Tax']
    const body = result.rows.map((row) => [
      `${Math.round(row.rate * 100)}%`,
      row.cap === null ? 'Above the prior bracket' : `Up to ${row.cap.toLocaleString('en-US')}`,
      (row.amountMinor / 100).toFixed(2),
    ])
    return [head.join(','), ...body.map((cells) => cells.join(','))].join('\n')
  }

  const copyText = resultCopy(result, status)

  return (
    <AppShell
      name="Income Tax Calculator"
      icon="taxes"
      hue="green"
      category="Finance"
      meta={hasResult ? 'Last result ready' : 'No result yet'}
      status={hasResult ? `Filing as ${status}` : 'Enter a gross income to start'}
    >
      <Card mono="Inputs" title="Calculation">
        <FormGrid>
          <TextInput
            label="Gross income"
            value={grossText}
            onChange={setGross}
            inputMode="numeric"
            placeholder="0"
          />
          <Select
            label="Filing status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
        </FormGrid>
        <Stack>
          <Button kind="primary" onClick={calculate}>
            Calculate
          </Button>
          {error ? (
            <span role="alert" style={{ fontSize: 'calc(14px * var(--tf))', color: 'var(--danger)' }}>
              {error}
            </span>
          ) : null}
        </Stack>
      </Card>

      <Card mono="Result" title="Result">
        <Stack>
          <div data-testid="result-line">
            Tax: {hasResult ? format(result.taxMinor) : summaryLabel}
          </div>
          <div data-testid="result-line">
            Effective rate: {hasResult ? `${result.effectivePct.toFixed(2)}%` : summaryLabel}
          </div>
          <div data-testid="result-line">
            Taxable income: {hasResult ? format(toMinorUnits(result.taxable)) : summaryLabel}
          </div>
        </Stack>
        {hasResult ? (
          <Stack>
            <Button kind="secondary" onClick={() => void clipboard.copy(copyText)}>
              {clipboard.copied ? 'Copied' : 'Copy result'}
            </Button>
            <ExportMenu
              fileName="tax-calculation"
              ariaLabel="Export result"
              options={[
                {
                  id: 'csv',
                  label: 'Export as CSV',
                  mimeType: 'text/csv',
                  extension: 'csv',
                  getData: () => exportCsv(),
                },
                {
                  id: 'json',
                  label: 'Export as JSON',
                  mimeType: 'application/json',
                  extension: 'json',
                  getData: () => exportJson(result, status),
                },
              ]}
            />
          </Stack>
        ) : null}
      </Card>

      <Card mono="Breakdown" title="Bracket breakdown">
        {result.rows.length === 0 ? (
          <Stack>
            <Body>Enter a gross income and press Calculate to see how the tax is built up by bracket.</Body>
          </Stack>
        ) : (
          <Table
            label="Bracket breakdown"
            columns={[
              { key: 'rate', label: 'Rate' },
              { key: 'span', label: 'Taxable span' },
              { key: 'amount', label: 'Tax in bracket', num: true },
            ]}
            rows={result.rows.map((row) => ({
              cells: {
                rate: `${Math.round(row.rate * 100)}%`,
                span: row.cap === null ? 'Above the prior bracket' : `Up to ${row.cap.toLocaleString('en-US')}`,
                amount: format(row.amountMinor),
              },
            }))}
            foot={{ rate: 'Total', span: '', amount: format(result.taxMinor) }}
          />
        )}
      </Card>

      <Card mono="Composition" title="Income composition">
        {chartData.length > 0 ? (
          <Chart
            type="donut"
            data={chartData}
            title="Income composition"
            width={320}
            height={200}
            ariaLabel="Income composition by federal tax and take-home"
          />
        ) : (
          <Stack>
            <Body>Run a calculation to split the gross income between tax and take-home.</Body>
          </Stack>
        )}
      </Card>

      <Card mono="Notes" title="About this estimate">
        <Stack>
          <Body>Uses a flat standard deduction and a fixed federal bracket table; credits, other deductions and state taxes are not included.</Body>
          <Body>Estimates only, not tax advice.</Body>
        </Stack>
      </Card>
    </AppShell>
  )
}
