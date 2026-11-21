import { useId, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  Cols,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Table,
  Tag,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type GradeState } from './host/mock'
import { fmt2, fmtPct, sumWeights, validateComponent, weightedTotal, weightsWarning } from './engine'

type FieldKey = 'name' | 'score' | 'weight'

const emptyFields: Record<FieldKey, string> = { name: '', score: '', weight: '' }

/** Kit TextInput with an onBlur hook for on-blur validation. */
function BlurTextInput({
  label,
  value,
  inputMode,
  placeholder,
  error,
  onChange,
  onBlur,
}: {
  label: string
  value: string
  inputMode?: 'text' | 'decimal'
  placeholder?: string
  error?: string | null
  onChange: (value: string) => void
  onBlur?: () => void
}) {
  const id = useId()
  return (
    <div className="lc-field">
      <label className="lc-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="lc-input"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error ? (
        <span id={`${id}-error`} className="lk-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/** Field-specific error text for the add form. */
function fieldErrors(name: string, score: string): Record<FieldKey, string | null> {
  const errs: Record<FieldKey, string | null> = { name: null, score: null, weight: null }
  const trimmedScore = score.trim()
  if (name.trim() === '') {
    errs.name = 'Enter a name and a score between 0 and 100'
  }
  if (trimmedScore === '') {
    errs.score = 'Enter a name and a score between 0 and 100'
  } else {
    const parsed = Number(trimmedScore)
    if (Number.isNaN(parsed)) errs.score = 'Score must be a number'
    else if (parsed < 0 || parsed > 100) errs.score = 'Enter a name and a score between 0 and 100'
  }
  return errs
}

export function App() {
  const [state, setState] = useState<GradeState>(() => host.read())
  const [fields, setFields] = useState(emptyFields)
  const [errors, setErrors] = useState<Record<FieldKey, string | null>>({
    name: null,
    score: null,
    weight: null,
  })
  const [exported, setExported] = useState<string | null>(null)

  const setField = (key: FieldKey, value: string) => {
    setFields((f) => ({ ...f, [key]: value }))
  }

  const commit = () => {
    const errs = fieldErrors(fields.name, fields.score)
    if (errs.name || errs.score || errs.weight) {
      setErrors(errs)
      return
    }
    setErrors({ name: null, score: null, weight: null })
    const weight = Number(fields.weight) || 0
    setState(host.addComponent(fields.name.trim(), Number(fields.score.trim()), weight))
    setFields(emptyFields)
  }

  const removeComponent = (id: string) => {
    setState(host.deleteComponent(id))
  }

  const clearAll = () => {
    setState(host.clear())
  }

  const total = weightedTotal(state)
  const weights = sumWeights(state)
  const count = state.components.length
  const warning = count > 0 ? weightsWarning(state) : null

  const chartData: ChartDataPoint[] = state.components.map((c) => ({
    label: c.name,
    value: (c.score * c.weight) / 100,
  }))

  const resultText = `Weighted Grade: ${fmt2(total)}%`
  const { copied, copy } = useClipboard({ timeoutMs: 1600 })

  const exportOptions: ExportOption[] =
    count === 0
      ? []
      : [
          {
            id: 'csv',
            label: 'Components CSV',
            mimeType: 'text/csv',
            extension: 'csv',
            getData: () =>
              [
                'name,score,weight,points',
                ...state.components.map((c) => `${c.name},${fmt2(c.score)},${fmt2(c.weight)},${fmt2((c.score * c.weight) / 100)}`),
              ].join('\n'),
          },
          {
            id: 'json',
            label: 'Components JSON',
            mimeType: 'application/json',
            extension: 'json',
            getData: () => JSON.stringify(state, null, 2),
          },
        ]

  return (
    <AppShell
      name="Grade Calculator"
      icon="school"
      hue="green"
      category="Productivity"
      meta={count > 0 ? `${count} components` : undefined}
      status={`Weighted total ${count > 0 ? fmt2(total) : '—'} · local, no network`}
      side={
        <Rail title="Grade Calculator" note="One course · local" chips={['Add', 'Export', 'Works offline']}>
          <Body>
            Add assessment components, see each one&apos;s point contribution, the total weight, and the
            final weighted grade. Copy the result, export the list, and it all survives a reload.
          </Body>
        </Rail>
      }
    >
      <Stack>
        <Card title="Add a component" mono="New">
          <FormGrid>
            <BlurTextInput
              label="Component Name"
              value={fields.name}
              onChange={(v) => setField('name', v)}
              error={errors.name}
              placeholder="Midterm"
            />
            <BlurTextInput
              label="Score"
              value={fields.score}
              inputMode="decimal"
              onChange={(v) => setField('score', v)}
              onBlur={() => setErrors(fieldErrors(fields.name, fields.score))}
              error={errors.score}
              placeholder="0.00"
            />
            <BlurTextInput
              label="Weight"
              value={fields.weight}
              inputMode="decimal"
              onChange={(v) => setField('weight', v)}
              error={errors.weight}
              placeholder="40"
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" ariaLabel="Add component" onClick={commit}>
              Add component
            </Button>
          </Actions>
        </Card>

        <Cols kind="main-side">
          <div>
            <Card title="Breakdown" mono={`${count} components`}>
              {count === 0 ? (
                <EmptyState mono="Empty" title="No components yet" detail="Add a component above to see its contribution." />
              ) : (
                <>
                  <Table
                    label="Breakdown"
                    columns={[
                      { key: 'name', label: 'Component' },
                      { key: 'score', label: 'Score', num: true },
                      { key: 'weight', label: 'Weight', num: true },
                      { key: 'points', label: 'Points', num: true },
                    ]}
                    rows={state.components.map((c) => ({
                      cells: {
                        name: (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                            {c.name}
                            <Button kind="ghost" ariaLabel={`Delete ${c.name}`} onClick={() => removeComponent(c.id)}>
                              Remove
                            </Button>
                          </span>
                        ),
                        score: fmt2(c.score),
                        weight: fmtPct(c.weight),
                        points: fmt2((c.score * c.weight) / 100),
                      },
                    }))}
                    foot={{
                      name: 'Total',
                      score: ' ',
                      weight: fmtPct(weights),
                      points: fmt2(total),
                    }}
                  />
                  <Actions>
                    <Button kind="secondary" ariaLabel="Clear all components" onClick={clearAll}>
                      Clear all
                    </Button>
                  </Actions>
                </>
              )}
            </Card>

            <Card title="Point contribution" mono="Chart">
              {count === 0 ? (
                <EmptyState title="Nothing to chart yet" detail="Each bar is a component's points: score times weight, over 100." />
              ) : (
                <Chart type="bar" data={chartData} title="Points per component" ariaLabel="Points per component" height={220} />
              )}
            </Card>
          </div>

          <div>
            <Card title="Summary" mono="Grade">
              {count === 0 ? (
                <KpiRow>
                  <Kpi value="0.00%" label="Weighted Grade" />
                </KpiRow>
              ) : (
                <KpiRow>
                  <Kpi value={`${fmt2(total)}%`} label="Weighted Grade" accent />
                </KpiRow>
              )}
              <Body>Weighted Grade: {fmt2(total)}%</Body>
              {warning ? <Tag>{warning}</Tag> : null}
              <Actions>
                <Button
                  kind="secondary"
                  onClick={() => void copy(resultText)}
                >
                  {copied ? 'Copied to clipboard' : 'Copy result'}
                </Button>
              </Actions>
            </Card>

            <Card title="Export" mono="Share">
              {exported ? <span role="status">{exported}</span> : null}
              {count === 0 ? (
                <EmptyState title="Nothing to export yet" detail="Add a component, then export or copy it here." />
              ) : (
                <ExportMenu
                  options={exportOptions}
                  fileName="grade-calculator"
                  ariaLabel="Export grade calculator"
                  onExport={(id) => setExported(`Exported ${id === 'csv' ? 'CSV' : 'JSON'}.`)}
                />
              )}
            </Card>
          </div>
        </Cols>
      </Stack>
    </AppShell>
  )
}
