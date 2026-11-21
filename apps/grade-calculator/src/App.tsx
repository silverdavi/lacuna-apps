import { useState, type ReactNode } from 'react'
import { Body, Button, Card, Stack, TextInput } from '@lacuna/ui'
import { host } from './host/mock'
import type { GradeState } from './host'

const fmt2 = (n: number): string => n.toFixed(2)
const fmtPct = (n: number): string => `${fmt2(n)}%`
const sumWeights = (state: GradeState): number =>
  state.components.reduce((acc, c) => acc + c.weight, 0)
const weightedTotal = (state: GradeState): number =>
  state.components.reduce((acc, c) => acc + (c.score * c.weight) / 100, 0)

type FormState = {
  name: string
  score: string
  weight: string
  error: string | null
}

type Row = {
  hot?: boolean
  cells: Record<string, ReactNode>
}

const emptyForm: FormState = { name: '', score: '', weight: '', error: null }

function BlurField({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
}) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      <input
        className="lc-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </label>
  )
}

export function App() {
  const [state, setState] = useState<GradeState>(() => host.read())
  const [form, setForm] = useState<FormState>(emptyForm)

  function patch(part: Partial<FormState>) {
    setForm((f) => ({ ...f, ...part, error: null }))
  }

  function validateScore(raw: string): number | null {
    const text = raw.trim()
    if (text === '') return null
    const value = Number(text)
    return Number.isFinite(value) ? value : null
  }

  function add() {
    const name = form.name.trim()
    const scoreRaw = form.score.trim()
    const weightRaw = form.weight.trim()
    if (!name || scoreRaw === '') {
      setForm((f) => ({ ...f, error: 'Enter a name and a score between 0 and 100' }))
      return
    }
    const score = validateScore(scoreRaw)
    if (score === null || score < 0 || score > 100) {
      setForm((f) => ({ ...f, error: 'Enter a name and a score between 0 and 100' }))
      return
    }
    const weight = weightRaw === '' ? 0 : Number(weightRaw)
    if (!Number.isFinite(weight) || weight < 0) {
      setForm((f) => ({ ...f, error: 'Enter a name and a score between 0 and 100' }))
      return
    }
    setState(host.addComponent(name, score, weight))
    setForm(emptyForm)
  }

  function onScoreBlur() {
    if (form.score.trim() !== '' && validateScore(form.score) === null) {
      setForm((f) => ({ ...f, error: 'Score must be a number' }))
    }
  }

  function remove(id: string) {
    setState(host.deleteComponent(id))
  }

  const totalWeight = sumWeights(state)
  const weighted = weightedTotal(state)
  const hasComponents = state.components.length > 0

  const columns = [
    { key: 'name', label: 'Component' },
    { key: 'score', label: 'Score', num: true },
    { key: 'weight', label: 'Weight', num: true },
    { key: 'contrib', label: 'Contribution', num: true },
    { key: 'actions', label: '' },
  ]

  const rows: Row[] = [
    ...state.components.map((c): Row => ({
      cells: {
        name: c.name,
        score: fmt2(c.score),
        weight: `${c.weight}%`,
        contrib: fmt2((c.score * c.weight) / 100),
        actions: (
          <Button kind="ghost" onClick={() => remove(c.id)}>
            Delete {c.name}
          </Button>
        ),
      },
    })),
    {
      hot: true,
      cells: {
        name: 'Total',
        score: '',
        weight: `${totalWeight}%`,
        contrib: fmtPct(weighted),
        actions: null,
      },
    },
  ]

  return (
    <main style={{ display: 'block', width: '100%', padding: 'calc(20px * var(--sf))' }}>
      <Card title="Grade Calculator" mono="WEIGHTED AVERAGES" accent>
        <Stack lg>
          <div>
            <h1
              style={{
                margin: 0,
                font: '600 calc(22px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
                letterSpacing: 'calc(-0.01em * var(--tf))',
              }}
            >
              Grade Calculator
            </h1>
            <Body>Add components with a score and a weight to see the final grade.</Body>
          </div>

          <Stack>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'calc(12px * var(--sf))',
                alignItems: 'flex-end',
              }}
            >
              <TextInput
                label="Component Name"
                value={form.name}
                onChange={(value) => patch({ name: value })}
              />
              <BlurField
                label="Score"
                value={form.score}
                onChange={(value) => patch({ score: value })}
                onBlur={onScoreBlur}
              />
              <TextInput
                label="Weight"
                value={form.weight}
                onChange={(value) => patch({ weight: value })}
              />
            </div>
            {form.error && (
              <div
                role="alert"
                style={{
                  color: 'var(--danger)',
                  font: '500 calc(11px * var(--tf)) var(--mono)',
                  letterSpacing: 'calc(0.4px * var(--sf))',
                }}
              >
                {form.error}
              </div>
            )}
            <div>
              <Button kind="primary" onClick={add}>
                Add component
              </Button>
            </div>
          </Stack>

          {!hasComponents ? (
            <Body>No components yet</Body>
          ) : (
            <div
              style={{
                width: '100%',
                border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                borderRadius: 'calc(6px * var(--sf))',
                overflow: 'hidden',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  font: '400 calc(13px * var(--tf)) var(--sans)',
                  color: 'var(--ink)',
                }}
              >
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        style={{
                          textAlign: c.num ? 'right' : 'left',
                          padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
                          border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                          background: 'var(--ui-bright)',
                          font: '600 calc(11px * var(--tf)) var(--mono)',
                          color: 'var(--ink-60)',
                          letterSpacing: 'calc(0.4px * var(--sf))',
                          textTransform: 'uppercase',
                        }}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          style={{
                            textAlign: c.num ? 'right' : 'left',
                            padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
                            border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                            background: r.hot ? 'var(--paper-deep)' : undefined,
                            font: r.hot
                              ? '600 calc(13px * var(--tf)) var(--sans)'
                              : '400 calc(13px * var(--tf)) var(--sans)',
                            color: r.hot ? 'var(--accent)' : 'var(--ink)',
                          }}
                        >
                          {r.cells[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasComponents && totalWeight !== 100 && (
            <div
              role="status"
              style={{
                color: 'var(--accent)',
                font: '500 calc(11px * var(--tf)) var(--mono)',
                letterSpacing: 'calc(0.4px * var(--sf))',
              }}
            >
              Weights sum to {totalWeight}%
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'calc(16px * var(--sf))',
              padding: 'calc(12px * var(--sf))',
              border: 'calc(1px * var(--sf)) solid var(--ui-line)',
              borderRadius: 'calc(6px * var(--sf))',
              background: 'var(--paper-deep)',
            }}
          >
            <span
              style={{
                font: '600 calc(22px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
              }}
            >
              Weighted Grade: {fmtPct(weighted)}
            </span>
          </div>
        </Stack>
      </Card>
    </main>
  )
}
