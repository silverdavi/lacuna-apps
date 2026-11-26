// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/calculator-kit 0.2.0: snapshot of lacuna-components CalculatorKit at 5271c52 by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { NumberInput } from '@lacuna/number-input'
import { Chart } from '@lacuna/chart'
import { RecordTable } from '@lacuna/record-table'
import type { ColumnDef } from '@lacuna/record-table'
import { Actions, Body, Button, Card, EmptyState, ErrorState, List, Row, SectionLabel, Stack } from '@lacuna/ui'
import type { CalculatorKitInput, CalculatorKitProps, CalculatorKitResult } from './index'

type Values = Record<string, number | null>

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
      const target = event.target
      if (typeof target === 'object' && target !== null && 'blur' in target) {
        ;(target as HTMLElement).blur()
      }
      calculate()
    }
  }

  const inputFields = inputs.map((input) => (
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
  ))

  const calculateButton = (
    <Button kind="primary" onClick={calculate} style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
      Calculate
    </Button>
  )

  const inputGroup = (
    <div
      role="group"
      aria-label={title ?? 'Calculator inputs'}
      onKeyDown={handleKeyDown}
    >
      <Stack>
        <Card title={title} mono="Calculator">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))' }}>
            {inputFields}
          </div>
        </Card>
        <Actions>{calculateButton}</Actions>
      </Stack>
    </div>
  )

  return (
    <Stack>
      {title === undefined && <SectionLabel>Calculator</SectionLabel>}
      {inputGroup}
      {result === null ? (
        <Card title="Result" mono="Awaiting input">
          <div aria-live="polite">
            <EmptyState title="No result yet" detail="Enter values and press Calculate." />
          </div>
        </Card>
      ) : (
        <Stack>
          <Card title="Result" mono="Computed">
            <div aria-live="polite">
              {result.summary.length === 0 ? (
                <EmptyState title="No summary" detail="The calculation returned no summary entries." />
              ) : (
                <List label="Result summary">
                  {result.summary.map((entry) => (
                    <Row key={entry.label} title={entry.label} value={entry.value} />
                  ))}
                </List>
              )}
            </div>
          </Card>
          {result.breakdown.length > 0 ? (
            <Card title="Breakdown" mono="Year by year">
              <RecordTable
                records={result.breakdown}
                columns={columns}
                ariaLabel="Breakdown"
                {...recordTableProps}
              />
            </Card>
          ) : (
            <Card title="Breakdown" mono="No rows">
              <ErrorState title="No breakdown" detail="The calculation returned no breakdown rows." mono="Breakdown" />
            </Card>
          )}
          {result.chart !== undefined && (
            <Card title="Chart" mono="Visual">
              <Chart data={result.chart.data} type="bar" {...chartProps} />
            </Card>
          )}
        </Stack>
      )}
    </Stack>
  )
}
