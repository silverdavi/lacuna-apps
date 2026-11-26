// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/calculator-kit 0.1.0: snapshot of lacuna-components CalculatorKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react'
import { NumberInput } from '@lacuna/number-input'
import { Chart } from '@lacuna/chart'
import { RecordTable } from '@lacuna/record-table'
import type { ColumnDef } from '@lacuna/record-table'
import type { CalculatorKitInput, CalculatorKitProps, CalculatorKitResult } from './index'

type Values = Record<string, number | null>

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(16px * var(--sf))',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(18px * var(--tf))',
  fontWeight: 700,
  color: 'var(--ink)',
}

const inputsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'calc(12px * var(--sf))',
}

const buttonStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--paper)',
  background: 'var(--ink)',
  border: 'none',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
  cursor: 'pointer',
}

const summaryStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(4px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(12px * var(--sf))',
  background: 'var(--paper-deep)',
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'calc(16px * var(--sf))',
}

const headingRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  fontWeight: 600,
  color: 'var(--ink)',
}

function defaultValues(inputs: CalculatorKitInput[]): Values {
  const out: Values = {}
  for (const input of inputs) out[input.id] = input.defaultValue ?? null
  return out
}

export function CalculatorKit(props: CalculatorKitProps): ReactElement {
  const { inputs, compute, title, recordTableProps, chartProps } = props
  const [values, setValues] = useState<Values>(() => defaultValues(inputs))
  const [result, setResult] = useState<CalculatorKitResult | null>(null)

  const columns: ColumnDef<Record<string, string | number>>[] = useMemo(() => {
    const first = result?.breakdown[0]
    if (first === undefined) return []
    return Object.keys(first).map((key) => ({ key, header: key }))
  }, [result])

  function calculate(): void {
    const next: Record<string, number> = {}
    for (const input of inputs) {
      const v = values[input.id]
      if (typeof v === 'number') next[input.id] = v
    }
    setResult(compute(next))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      calculate()
    }
  }

  return (
    <div style={wrapStyle}>
      {title !== undefined && (
        <h2 style={headingStyle} data-testid="calc-title">
          {title}
        </h2>
      )}
      <div
        style={inputsStyle}
        role="group"
        aria-label={title ?? 'Calculator inputs'}
        onKeyDown={handleKeyDown}
      >
        {inputs.map((input) => (
          <NumberInput
            key={input.id}
            label={input.label}
            value={values[input.id] ?? null}
            min={input.min}
            max={input.max}
            step={input.step}
            unit={input.unit}
            onChange={(v) => setValues((prev) => ({ ...prev, [input.id]: v }))}
          />
        ))}
        <button type="button" style={buttonStyle} onClick={calculate}>
          Calculate
        </button>
      </div>
      {result === null ? (
        <div style={summaryStyle} aria-live="polite">
          <span>Enter values and press Calculate.</span>
        </div>
      ) : (
        <div style={wrapStyle}>
          <div style={summaryStyle}>
            <h3 style={headingRowStyle}>Result</h3>
            {result.summary.map((entry) => (
              <div key={entry.label} style={rowStyle}>
                <span>{entry.label}</span>
                <span style={{ fontFamily: 'var(--mono)' }}>{entry.value}</span>
              </div>
            ))}
          </div>
          {result.breakdown.length > 0 && (
            <RecordTable
              records={result.breakdown}
              columns={columns}
              ariaLabel="Breakdown"
              {...recordTableProps}
            />
          )}
          {result.chart !== undefined && (
            <Chart data={result.chart.data} type="bar" {...chartProps} />
          )}
        </div>
      )}
    </div>
  )
}
