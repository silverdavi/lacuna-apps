import { useState } from 'react'
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

function DonutChart({ result }: { result: ReturnType<typeof computeResult> }) {
  const segments = [
    { label: 'Net Pay', minor: result.netMinor },
    ...result.rows,
  ]
  const total = segments.reduce((acc, s) => add(acc, s.minor), 0)
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const outerR = 84
  const innerR = 52
  let angle = 0
  const donutSegments = total > 0 ? segments.filter((s) => s.minor > 0).map((s) => {
    const sweep = (s.minor / total) * 360
    const a0 = ((angle - 90) * Math.PI) / 180
    const a1 = ((angle + sweep - 90) * Math.PI) / 180
    angle += sweep
    const x0 = cx + outerR * Math.cos(a0)
    const y0 = cy + outerR * Math.sin(a0)
    const x1 = cx + outerR * Math.cos(a1)
    const y1 = cy + outerR * Math.sin(a1)
    const xi1 = cx + innerR * Math.cos(a1)
    const yi1 = cy + innerR * Math.sin(a1)
    const xi0 = cx + innerR * Math.cos(a0)
    const yi0 = cy + innerR * Math.sin(a0)
    const large = sweep > 180 ? 1 : 0
    const d = total === s.minor
      ? `M ${cx + outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy} A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy} Z M ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} Z`
      : `M ${x0} ${y0} A ${outerR} ${outerR} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${innerR} ${innerR} 0 ${large} 0 ${xi0} ${yi0} Z`
    return { ...s, d, percent: Math.round((s.minor / total) * 100) }
  }) : []
  return (
    <div style={{ display: 'flex', gap: 'calc(24px * var(--sf))', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Pay composition">
        <g fillRule="evenodd" fill="var(--ink)">
          {donutSegments.map((seg, i) => (
            <path key={seg.label} d={seg.d} opacity={i === 0 ? 1 : 0.45 - Math.min(i - 1, 3) * 0.1} />
          ))}
        </g>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }}>
        {segments.map((s, i) => (
          <li
            key={s.label}
            role="listitem"
            style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--sf))', fontSize: 'calc(13px * var(--tf))' }}
          >
            <span
              aria-hidden
              style={{
                width: 'calc(12px * var(--sf))',
                height: 'calc(12px * var(--sf))',
                borderRadius: 'calc(3px * var(--sf))',
                background: 'var(--ink)',
                opacity: i === 0 ? 1 : 0.45 - Math.min(i - 1, 3) * 0.1,
                display: 'inline-block',
              }}
            />
            <span>{s.label}</span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-60)' }}>{format(s.minor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const inputStyle = {
  font: 'inherit',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  borderWidth: 'calc(1px * var(--sf))',
  borderStyle: 'solid' as const,
  borderColor: 'var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
  width: 'calc(140px * var(--sf))',
}

const labelStyle = { fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)', display: 'block', marginBottom: 'calc(4px * var(--sf))' }

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
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value
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

  return (
    <main style={{ display: 'block', width: '100%', maxWidth: 'calc(760px * var(--sf))', margin: '0 auto', padding: 'calc(24px * var(--sf))' }}>
      <h1 style={{ font: '600 calc(24px * var(--tf)) var(--sans)', color: 'var(--ink)', margin: '0 0 calc(4px * var(--sf))' }}>
        Salary Calculator
      </h1>
      <p style={{ margin: '0 0 calc(24px * var(--sf))', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink-60)' }}>
        Enter your gross annual salary and standard deductions to see your net pay.
      </p>

      <section
        aria-label="Inputs"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(16px * var(--sf))', alignItems: 'flex-end', marginBottom: 'calc(8px * var(--sf))' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Gross Annual Salary</span>
          <input
            aria-label="Gross Annual Salary"
            inputMode="numeric"
            value={value.gross === null ? '' : String(value.gross)}
            onChange={onNumberChange('gross')}
            style={inputStyle}
          />
        </label>
        {DEDUCTION_FIELDS.map((field) => (
          <label key={field.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={labelStyle}>{field.label}</span>
            <input
              aria-label={field.label}
              inputMode="numeric"
              value={value[field.id] === null ? '' : String(value[field.id])}
              onChange={onNumberChange(field.id)}
              style={inputStyle}
            />
          </label>
        ))}
        <button
          type="button"
          onClick={calculate}
          style={{
            font: '600 calc(14px * var(--tf)) var(--sans)',
            color: 'var(--paper)',
            background: 'var(--ink)',
            border: 'none',
            borderRadius: 'calc(4px * var(--sf))',
            padding: 'calc(9px * var(--sf)) calc(18px * var(--sf))',
            cursor: 'pointer',
          }}
        >
          Calculate
        </button>
      </section>

      {error !== null && (
        <p role="alert" style={{ margin: '0 0 calc(16px * var(--sf))', color: 'var(--danger)', fontSize: 'calc(13px * var(--tf))' }}>
          {error}
        </p>
      )}

      <section
        aria-label="Result"
        style={{ border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(8px * var(--sf))', padding: 'calc(16px * var(--sf))', marginBottom: 'calc(16px * var(--sf))' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(16px * var(--sf))', flexWrap: 'wrap', marginBottom: 'calc(16px * var(--sf))' }}>
          <span style={{ font: '600 calc(20px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>
            Net Pay: {format(result.netMinor)}
          </span>
          <span style={{ fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)', fontFamily: 'var(--mono)' }}>
            Gross: {format(result.grossMinor)}
          </span>
        </div>
        {grossForCalc > 0 && <DonutChart result={result} />}
      </section>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 'calc(8px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)' }}>Deduction</th>
            <th style={{ textAlign: 'right', padding: 'calc(8px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ padding: 'calc(12px * var(--sf))', color: 'var(--ink-60)', fontStyle: 'italic' }}>
                No deductions
              </td>
            </tr>
          ) : (
            result.rows.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: 'calc(8px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--hair)' }}>{row.label}</td>
                <td style={{ padding: 'calc(8px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--hair)', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                  {format(row.minor)}
                </td>
              </tr>
            ))
          )}
          {result.rows.length > 0 && (
            <tr>
              <td style={{ padding: 'calc(8px * var(--sf))', font: '600 calc(14px * var(--tf)) var(--sans)' }}>Total Deductions</td>
              <td style={{ padding: 'calc(8px * var(--sf))', textAlign: 'right', fontFamily: 'var(--mono)', font: '600 calc(14px * var(--tf)) var(--mono)' }}>
                {format(result.totalDeduction)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
