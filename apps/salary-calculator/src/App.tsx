import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, List, Rail, Row, Table, TextInput } from '@lacuna/ui'
import { add, format, sub, toMinorUnits } from '@lacuna/money'
import { useLocalRecord } from '@lacuna/use-local-record'

const DEDUCTION_FIELDS = [
  { id: 'federal', label: 'Federal Tax' },
  { id: 'state', label: 'State Tax' },
  { id: 'other', label: 'Other Deductions' },
] as const

type DeductionId = (typeof DEDUCTION_FIELDS)[number]['id']

interface StoredState {
  gross: number | null
  federal: number | null
  state: number | null
  other: number | null
  computed: boolean
}

const DEFAULT_STATE: StoredState = {
  gross: null,
  federal: null,
  state: null,
  other: null,
  computed: false,
}

function toMinor(value: number): number {
  return Math.round(toMinorUnits(value))
}

function deductionRows(state: StoredState): { id: DeductionId; label: string; minor: number }[] {
  return DEDUCTION_FIELDS.filter((field) => (state[field.id] ?? 0) > 0).map((field) => ({
    id: field.id,
    label: field.label,
    minor: toMinor(state[field.id] ?? 0),
  }))
}

function computeResult(state: StoredState) {
  const grossMinor = toMinor(state.gross ?? 0)
  const federalProvided = (state.federal ?? 0) > 0
  const stateProvided = (state.state ?? 0) > 0
  const otherProvided = (state.other ?? 0) > 0

  const federalMinor = federalProvided ? toMinor(state.federal ?? 0) : toMinor((state.gross ?? 0) * 0.25)
  const stateMinor = stateProvided ? toMinor(state.state ?? 0) : 0
  const otherMinor = otherProvided ? toMinor(state.other ?? 0) : 0

  const rows: { id: DeductionId; label: string; minor: number }[] = []
  if (federalMinor > 0) rows.push({ id: 'federal', label: 'Federal Tax', minor: federalMinor })
  if (stateMinor > 0) rows.push({ id: 'state', label: 'State Tax', minor: stateMinor })
  if (otherMinor > 0) rows.push({ id: 'other', label: 'Other Deductions', minor: otherMinor })

  const totalDeduction = rows.reduce((acc, row) => add(acc, row.minor), 0)
  const netMinor = sub(grossMinor, totalDeduction)
  return { grossMinor, rows, totalDeduction, netMinor }
}

// One token hue per segment: net pay first, then the deductions in table order.
const SEGMENT_HUES = ['var(--geo-green)', 'var(--geo-verm)', 'var(--geo-cobalt)', 'var(--geo-gold)']

function DonutChart({ result }: { result: ReturnType<typeof computeResult> }) {
  const segments = [{ label: 'Net Pay', minor: result.netMinor }, ...result.rows]
  const total = segments.reduce((acc, s) => add(acc, s.minor), 0)
  const size = 168
  const c = size / 2
  const outerR = 80
  const innerR = 50
  let angle = 0
  const arcs = segments.map((s, i) => {
    const sweep = total > 0 ? (s.minor / total) * 360 : 0
    const a0 = ((angle - 90) * Math.PI) / 180
    const a1 = ((angle + sweep - 90) * Math.PI) / 180
    angle += sweep
    const pt = (r: number, a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`
    const large = sweep > 180 ? 1 : 0
    const d = sweep >= 360
      ? `M ${c + outerR} ${c} A ${outerR} ${outerR} 0 1 1 ${c - outerR} ${c} A ${outerR} ${outerR} 0 1 1 ${c + outerR} ${c} Z M ${c + innerR} ${c} A ${innerR} ${innerR} 0 1 0 ${c - innerR} ${c} A ${innerR} ${innerR} 0 1 0 ${c + innerR} ${c} Z`
      : `M ${pt(outerR, a0)} A ${outerR} ${outerR} 0 ${large} 1 ${pt(outerR, a1)} L ${pt(innerR, a1)} A ${innerR} ${innerR} 0 ${large} 0 ${pt(innerR, a0)} Z`
    return { ...s, d, hue: SEGMENT_HUES[i % SEGMENT_HUES.length], percent: total > 0 ? Math.round((s.minor / total) * 100) : 0 }
  })
  return (
    <div style={{ display: 'flex', gap: 'calc(24px * var(--sf))', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Pay composition" style={{ flex: 'none' }}>
        <g fillRule="evenodd" stroke="var(--ink)" strokeWidth={1}>
          {arcs.filter((a) => a.minor > 0).map((a) => <path key={a.label} d={a.d} fill={a.hue} />)}
        </g>
      </svg>
      <div style={{ flex: '1 1 calc(220px * var(--sf))', minWidth: 0 }}>
        <List label="Pay composition">
          {arcs.map((a) => (
            <Row
              key={a.label}
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                  <span aria-hidden style={{ width: 'calc(10px * var(--sf))', height: 'calc(10px * var(--sf))', background: a.hue, border: 'calc(1px * var(--sf)) solid var(--ink)', flex: 'none' }} />
                  {a.label}
                </span>
              }
              meta={`${a.percent}% of gross`}
              value={format(a.minor)}
            />
          ))}
        </List>
      </div>
    </div>
  )
}

export function App() {
  const { value, set } = useLocalRecord<StoredState>({
    key: 'lacuna.salary-calculator',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })
  const [error, setError] = useState<string | null>(null)

  function patch(part: Partial<StoredState>) {
    set((prev) => ({ ...prev, ...part }))
  }

  function onNumberChange(field: 'gross' | DeductionId) {
    return (text: string) => {
      if (text === '') {
        patch({ [field]: null })
        return
      }
      if (!/^\d+$/.test(text)) {
        setError('Enter a valid number')
        return
      }
      setError(null)
      const value = Number(text)
      if (field === 'gross' && value === 0) {
        setError('Gross salary must be greater than 0')
        patch({ [field]: null, computed: true })
        return
      }
      patch({ [field]: value })
    }
  }

  function calculate() {
    const gross = value.gross
    if (gross === null || gross <= 0) {
      if (error === null) {
        setError('Gross salary must be greater than 0')
      }
      patch({ computed: true })
      return
    }
    setError(null)
    patch({ computed: true })
  }

  const active = value.computed && value.gross !== null && value.gross > 0
  const result = active ? computeResult(value) : computeResult(DEFAULT_STATE)
  const grossForCalc = active ? (value.gross ?? 0) : 0

  const field = (id: 'gross' | DeductionId) => (value[id] === null ? '' : String(value[id]))

  return (
    <AppShell
      name="Salary Calculator"
      icon="payroll"
      hue="green"
      category="Finance"
      meta="Annual · USD"
      status={active ? 'Last calculation saved on this device' : 'Nothing calculated yet'}
      side={
        <Rail title="Net pay" note="Gross minus deductions" chips={['Federal 25% by default', 'State tax', 'Other deductions', 'Saved on this device']}>
          Leave Federal Tax empty to use 25% of gross. Amounts are whole dollars per year.
        </Rail>
      }
    >
      <Card mono="Input" title="Salary and deductions">
        <FormGrid>
          <TextInput label="Gross Annual Salary" inputMode="numeric" value={field('gross')} onChange={onNumberChange('gross')} error={error} />
          {DEDUCTION_FIELDS.map((f) => (
            <TextInput key={f.id} label={f.label} inputMode="numeric" value={field(f.id)} onChange={onNumberChange(f.id)} />
          ))}
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={calculate}>Calculate</Button>
        </Actions>
      </Card>

      <Card mono="Result" title="Take-home pay">
        <KpiRow>
          <Kpi value={`Net Pay: ${format(result.netMinor)}`} label="Per year, after deductions" accent />
          <Kpi value={format(result.grossMinor)} label="Gross" />
          <Kpi value={format(result.totalDeduction)} label="Total deductions" />
        </KpiRow>
        <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
          {grossForCalc > 0 ? (
            <DonutChart result={result} />
          ) : (
            <EmptyState mono="Empty" title="No result yet" detail="Enter a gross annual salary and press Calculate to see where it goes." />
          )}
        </div>
      </Card>

      <Card mono={`${result.rows.length} ${result.rows.length === 1 ? 'line' : 'lines'}`} title="Breakdown">
        <Table
          label="Deductions"
          columns={[{ key: 'label', label: 'Deduction' }, { key: 'amount', label: 'Amount', num: true }]}
          rows={result.rows.map((row) => ({ cells: { label: row.label, amount: format(row.minor) } }))}
          empty="No deductions"
          foot={result.rows.length > 0 ? { label: 'Total Deductions', amount: format(result.totalDeduction) } : undefined}
        />
      </Card>
    </AppShell>
  )
}
