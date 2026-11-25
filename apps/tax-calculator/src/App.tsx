import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu } from '@lacuna/export-menu'
import { add, format, sub, toMinorUnits } from '@lacuna/money'
import { AppShell, Card, EmptyState, Kpi, KpiRow, PrimaryButton, Select, Stack, Table, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

type FilingStatus = 'Single' | 'Married filing jointly' | 'Married filing separately' | 'Head of household'

const STATUS_OPTIONS: string[] = ['Single', 'Married filing jointly', 'Married filing separately', 'Head of household']

interface Tier {
  upTo: number | null
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
    { upTo: 10000, rate: 0.1 },
    { upTo: 40000, rate: 0.12 },
    { upTo: 90000, rate: 0.22 },
    { upTo: 190000, rate: 0.256 },
    { upTo: null, rate: 0.28 },
  ],
  'Married filing jointly': [
    { upTo: 10000, rate: 0.1 },
    { upTo: 40000, rate: 34 / 300 },
    { upTo: 90000, rate: 0.17 },
    { upTo: 190000, rate: 0.19 },
    { upTo: null, rate: 0.21 },
  ],
  'Married filing separately': [
    { upTo: 10000, rate: 0.1 },
    { upTo: 40000, rate: 34 / 300 },
    { upTo: 90000, rate: 0.17 },
    { upTo: 190000, rate: 0.19 },
    { upTo: null, rate: 0.21 },
  ],
  'Head of household': [
    { upTo: 10000, rate: 0.1 },
    { upTo: 40000, rate: 0.12 },
    { upTo: 90000, rate: 0.22 },
    { upTo: 190000, rate: 0.256 },
    { upTo: null, rate: 0.28 },
  ],
}

interface BracketRow {
  rate: number
  upTo: number | null
  spanFrom: number
  spanTo: number
  taxable: number
  tax: number
}

function buildBrackets(taxable: number, tiers: Tier[]): BracketRow[] {
  const rows: BracketRow[] = []
  let start = 0
  for (const tier of tiers) {
    if (taxable <= start) break
    const end = tier.upTo === null ? taxable : Math.min(taxable, tier.upTo)
    const taxableMinor = toMinorUnits(end - start)
    if (taxableMinor > 0) {
      rows.push({
        rate: tier.rate,
        upTo: tier.upTo,
        spanFrom: start,
        spanTo: end,
        taxable: taxableMinor,
        tax: toMinorUnits((end - start) * tier.rate),
      })
    }
    start = tier.upTo ?? Infinity
  }
  return rows
}

interface Result {
  gross: number
  grossMinor: number
  deduction: number
  deductionMinor: number
  taxable: number
  taxableMinor: number
  taxMinor: number
  effectivePct: number
  rows: BracketRow[]
}

function computeResult(gross: number, status: FilingStatus): Result {
  const deduction = DEDUCTION[status]
  const tiers = TIERS[status]
  const taxable = Math.max(0, gross - deduction)
  const taxableMinor = toMinorUnits(taxable)
  const rows = buildBrackets(taxable, tiers)
  let taxMinor = 0
  for (const row of rows) taxMinor = add(taxMinor, row.tax)
  const effectivePct = gross > 0 ? (taxMinor / 100) / gross * 100 : 0
  return {
    gross,
    grossMinor: toMinorUnits(gross),
    deduction,
    deductionMinor: toMinorUnits(deduction),
    taxable,
    taxableMinor,
    taxMinor,
    effectivePct,
    rows,
  }
}

function composition(result: Result): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  if (result.taxMinor > 0) data.push({ label: 'Federal tax', value: result.taxMinor })
  const net = sub(result.grossMinor, result.taxMinor)
  if (net > 0) data.push({ label: 'Take-home', value: net })
  return data
}

function exportJson(result: Result, status: FilingStatus): string {
  return JSON.stringify(
    {
      grossIncome: result.gross,
      filingStatus: status,
      standardDeduction: result.deduction,
      taxableIncome: result.taxable,
      tax: result.taxMinor / 100,
      effectiveRate: Number(result.effectivePct.toFixed(4)),
      currency: 'USD',
      bracketBreakdown: result.rows.map((r) => ({
        rate: r.rate,
        upTo: r.upTo,
        spanFrom: r.spanFrom,
        spanTo: r.spanTo,
        taxable: r.taxable / 100,
        tax: r.tax / 100,
      })),
    },
    null,
    2,
  )
}

function exportCsv(result: Result): string {
  const head = ['Rate', 'Up to', 'Taxable', 'Tax']
  const body = result.rows.map((row) => [
    `${Math.round(row.rate * 100)}%`,
    row.upTo === null ? 'Above prior bracket' : String(row.upTo),
    (row.taxable / 100).toFixed(2),
    (row.tax / 100).toFixed(2),
  ])
  return [head.join(','), ...body.map((cells) => cells.join(','))].join('\n')
}

interface StoredRecord {
  gross: string
  status: FilingStatus
  computed: boolean
  error: boolean
}

const DEFAULT_RECORD: StoredRecord = { gross: '', status: 'Single', computed: false, error: false }

export function App() {
  const record = useLocalRecord<StoredRecord>({
    key: 'lacuna.tax-calculator',
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })
  const clipboard = useClipboard({ timeoutMs: 1600 })

  const grossText = record.value.gross
  const status = record.value.status
  const gross = record.value.computed && grossText.trim() !== '' ? Number(grossText) : 0
  const result = record.value.computed ? computeResult(gross, status) : computeResult(0, status)
  const hasResult = record.value.computed && gross > 0
  const chartData = composition(result)

  function setGross(text: string) {
    record.set((prev) => ({ ...prev, gross: text, computed: false }))
  }

  function setStatus(next: string) {
    record.set((prev) => ({ ...prev, status: next as FilingStatus, computed: false }))
  }

  function calculate() {
    const text = grossText.trim()
    const value = /^\d+$/.test(text) ? Number(text) : NaN
    if (!Number.isFinite(value) || value <= 0) {
      record.set((prev) => ({ ...prev, gross: text, computed: false, error: true }))
      return
    }
    record.set((prev) => ({ ...prev, gross: String(value), computed: true, error: false }))
  }

  const grossError = record.value.error ? 'Enter a gross income greater than 0' : null

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
        <Stack>
          <Select label="Filing status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <TextInput
            label="Gross income"
            value={grossText}
            onChange={setGross}
            inputMode="numeric"
            placeholder="0"
            error={grossError}
          />
          <PrimaryButton onClick={calculate}>Calculate</PrimaryButton>
        </Stack>
      </Card>

      <Card mono="Result" title="Result">
        <Stack>
          <KpiRow>
            <Kpi value={format(result.taxMinor)} label="Tax" accent />
            <Kpi value={`${result.effectivePct.toFixed(2)}%`} label="Effective rate" />
            <Kpi value={format(result.taxableMinor)} label="Taxable income" />
          </KpiRow>
          <div data-testid="result-line">Tax: {format(result.taxMinor)}</div>
          <div data-testid="result-line">Effective rate: {result.effectivePct.toFixed(2)}%</div>
          <div data-testid="result-line">Taxable income: {format(result.taxableMinor)}</div>
          <Stack>
            <PrimaryButton onClick={() => void clipboard.copy(`Tax: ${format(result.taxMinor)}`)}>
              {clipboard.copied ? 'Copied' : 'Copy result'}
            </PrimaryButton>
            <ExportMenu
              fileName="tax-calculation"
              ariaLabel="Export result"
              options={[
                {
                  id: 'csv',
                  label: 'Export as CSV',
                  mimeType: 'text/csv',
                  extension: 'csv',
                  getData: () => exportCsv(result),
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
        </Stack>
      </Card>

      <Card mono="Breakdown" title="Bracket breakdown">
        {result.rows.length === 0 ? (
          <EmptyState title="No brackets" detail="Enter a gross income and press Calculate to see how the tax is built up by bracket." actionLabel="Enter a gross income" />
        ) : (
          <Table
            label="Bracket breakdown"
            columns={[
              { key: 'rate', label: 'Rate' },
              { key: 'span', label: 'Taxable span' },
              { key: 'taxable', label: 'Taxed', num: true },
              { key: 'amount', label: 'Tax in bracket', num: true },
            ]}
            rows={result.rows.map((row) => ({
              cells: {
                rate: `${Math.round(row.rate * 100)}%`,
                span: row.upTo === null ? `Above ${format(toMinorUnits(row.spanFrom))}` : `Up to ${format(toMinorUnits(row.upTo))}`,
                taxable: format(row.taxable),
                amount: format(row.tax),
              },
            }))}
            foot={{ rate: 'Total', span: '', taxable: format(result.taxableMinor), amount: format(result.taxMinor) }}
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
          <EmptyState title="No data" detail="Run a calculation to split the gross income between tax and take-home." actionLabel="Run a calculation" />
        )}
      </Card>
    </AppShell>
  )
}
