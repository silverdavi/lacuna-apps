import { useState } from 'react'
import { AppShell, Button, Card, Stack } from '@lacuna/ui'
import { host, type GradeState } from './host/mock'
import { fmt2, fmtPct, sumWeights, validateComponent, weightedTotal, weightsWarning } from './engine'

const emptyFields = { name: '', score: '', weight: '' }

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

  const removeComponent = (id: string, name: string) => {
    void name
    setState(host.deleteComponent(id))
  }

  const clearAll = () => {
    setState(host.clear())
  }

  const total = weightedTotal(state)
  const weights = sumWeights(state)
  const warning = state.components.length > 0 ? weightsWarning(state) : null

  return (
    <AppShell
      name="Grade Calculator"
      icon="school"
      hue="green"
      meta={state.components.length > 0 ? `${state.components.length} components` : undefined}
      status={`Weighted total ${state.components.length > 0 ? fmt2(total) : '—'} · local, no network`}
    >
      <Stack>
        <Card title="Add a component" mono="New">
          <div style={{ display: 'grid', gap: 'calc(10px * var(--sf))' }}>
            <label className="lc-field">
              <span className="lc-field-label">Component Name</span>
              <input
                className="lc-input"
                value={fields.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </label>
            <label className="lc-field">
              <span className="lc-field-label">Score</span>
              <input
                className="lc-input"
                value={fields.score}
                inputMode="decimal"
                aria-invalid={error ? true : undefined}
                onChange={(e) => setField('score', e.target.value)}
                onBlur={onScoreBlur}
              />
            </label>
            <label className="lc-field">
              <span className="lc-field-label">Weight</span>
              <input
                className="lc-input"
                value={fields.weight}
                inputMode="decimal"
                onChange={(e) => setField('weight', e.target.value)}
              />
            </label>
            {error ? (
              <div
                role="alert"
                style={{
                  gridColumn: '1 / -1',
                  color: 'var(--danger)',
                  fontSize: 'calc(13px * var(--tf))',
                }}
              >
                {error}
              </div>
            ) : null}
          </div>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Button kind="primary" ariaLabel="Add component" onClick={commit}>
              Add component
            </Button>
          </div>
        </Card>

        <Card title="Summary" mono="Grade">
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'calc(8px * var(--sf))',
              padding: 'calc(8px * var(--sf)) 0 calc(12px * var(--sf))',
            }}
          >
            <span
              style={{ fontSize: 'calc(28px * var(--tf))', fontVariantNumeric: 'tabular-nums' }}
              aria-hidden="true"
            >
              {state.components.length > 0 ? fmt2(total) : '—'}
            </span>
            <span aria-hidden="true" style={{ fontSize: 'calc(16px * var(--tf))', color: 'var(--mid)' }}>
              / 100
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--mid)' }}>Weights add to {fmtPct(weights)}.</span>
          </div>
          <div>Weighted Grade: {fmt2(total)}%</div>
          {warning ? (
            <div style={{ color: 'var(--mid)' }}>{warning}</div>
          ) : null}
        </Card>

        {state.components.length === 0 ? (
          <div style={{ color: 'var(--mid)' }}>No components yet</div>
        ) : (
          <Card mono="Breakdown">
            <table className="lc-table">
              <thead>
                <tr>
                  <th scope="col">Component</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Score</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Weight</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {state.components.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                        {c.name}
                        <button
                          type="button"
                          className="lc-btn"
                          aria-label={`Delete ${c.name}`}
                          onClick={() => removeComponent(c.id, c.name)}
                          style={{ padding: 0, fontSize: 'calc(12px * var(--tf))', color: 'var(--mid)' }}
                        >
                          Remove
                        </button>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt2(c.score)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(c.weight)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt2((c.score * c.weight) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td />
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(weights)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt2(total)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}

        {state.components.length > 0 ? (
          <div>
            <Button kind="secondary" ariaLabel="Clear all components" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        ) : null}
      </Stack>
    </AppShell>
  )
}
