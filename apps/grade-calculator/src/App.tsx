import { useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Table,
  Tag,
} from '@lacuna/ui'
import { host, type GradeState } from './host/mock'
import { fmt2, fmtPct, sumWeights, validateComponent, weightedTotal, weightsWarning } from './engine'

const emptyFields = { name: '', score: '', weight: '' }

/** Wraps the kit field so the app can reach the native input's blur (the kit TextInput has no onBlur prop). */
function BlurField({
  label,
  value,
  inputMode,
  error,
  onChange,
  onBlur,
}: {
  label: string
  value: string
  inputMode?: 'text' | 'decimal'
  error?: string | null
  onChange: (value: string) => void
  onBlur?: () => void
}) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      <input
        className="lc-input"
        inputMode={inputMode}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error ? <span className="lk-field-error" role="alert">{error}</span> : null}
    </label>
  )
}

export function App() {
  const [state, setState] = useState<GradeState>(() => host.read())
  const [fields, setFields] = useState(emptyFields)
  const [error, setError] = useState<string | null>(null)

  const setField = (key: 'name' | 'score' | 'weight', value: string) => {
    setFields((f) => ({ ...f, [key]: value }))
  }

  const commit = () => {
    const v = validateComponent(fields.name, fields.score, fields.weight)
    if (!v.ok) {
      setError(v.message)
      return
    }
    setError(null)
    const weight = Number(fields.weight) || 0
    setState(host.addComponent(v.name, v.score, weight))
    setFields(emptyFields)
  }

  const onScoreBlur = () => {
    const v = validateComponent(fields.name, fields.score, fields.weight)
    if (!v.ok) setError(v.message)
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

  return (
    <AppShell
      name="Grade Calculator"
      icon="school"
      hue="green"
      category="Productivity"
      meta={count > 0 ? `${count} components` : undefined}
      status={`Weighted total ${count > 0 ? fmt2(total) : '—'} · local, no network`}
      side={<Rail title="Grade Calculator" note="One course · local" chips={['Add', 'Remove', 'Works offline']} />}
    >
      <Stack>
        <Card title="Add a component" mono="New">
          <FormGrid>
            <BlurField
              label="Component Name"
              value={fields.name}
              onChange={(v) => setField('name', v)}
            />
            <BlurField
              label="Score"
              value={fields.score}
              inputMode="decimal"
              error={error}
              onChange={(v) => setField('score', v)}
              onBlur={onScoreBlur}
            />
            <BlurField
              label="Weight"
              value={fields.weight}
              inputMode="decimal"
              onChange={(v) => setField('weight', v)}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" ariaLabel="Add component" onClick={commit}>
              Add component
            </Button>
          </Actions>
        </Card>

        <Card title="Summary" mono="Grade">
          {count === 0 ? (
            <EmptyState mono="Empty" title="No components yet" detail="Add a component above to see its contribution." />
          ) : (
            <KpiRow>
              <Kpi value={`${fmt2(total)}%`} label="Weighted Grade" accent />
            </KpiRow>
          )}
          <Body>Weighted Grade: {fmt2(total)}%</Body>
          {warning ? <Tag>{warning}</Tag> : null}
        </Card>

        {count > 0 ? (
          <Card title="Breakdown" mono={`${count} components`}>
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
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  )
}
