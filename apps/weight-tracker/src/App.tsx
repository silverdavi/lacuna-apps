import { useState } from 'react'
import { Body, Button, Card, EmptyState, MonoLabel, Stack, TextInput } from '@lacuna/ui'
import { host } from './host/mock'
import type { WeightEntry } from './host'

type FormState = {
  open: boolean
  date: string
  weight: string
  error: string | null
}

function today(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fmtWeight(value: number): string {
  return `${Math.round(value * 10) / 10}`
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const width = 340
  const height = 150
  const padX = 30
  const padTop = 16
  const padBottom = 24
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const weights = entries.map((e) => e.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1
  const step = entries.length > 1 ? innerW / (entries.length - 1) : 0
  const pts = entries.map((e, i) => {
    const x = entries.length > 1 ? padX + i * step : padX + innerW / 2
    const y = padTop + innerH - ((e.weight - min) / span) * innerH
    return { x, y, entry: e }
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  return (
    <div>
      <MonoLabel sm style={{ color: 'var(--ink-60)' }}>
        TREND
      </MonoLabel>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Weight over time"
        style={{ display: 'block', marginTop: 'calc(8px * var(--sf))' }}
      >
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p) => (
          <circle key={p.entry.id} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="3.5" fill="var(--accent)" />
        ))}
        {pts.map((p) => (
          <text
            key={`lbl-${p.entry.id}`}
            x={p.x.toFixed(2)}
            y={(height - 8).toFixed(2)}
            textAnchor="middle"
            fontSize="calc(8.5px * var(--tf))"
            fill="var(--ink-40)"
            fontFamily="var(--mono)"
          >
            {p.entry.date}
          </text>
        ))}
      </svg>
    </div>
  )
}

export function App() {
  const [state, setState] = useState(() => host.read())
  const [form, setForm] = useState<FormState>({ open: false, date: today(), weight: '', error: null })

  const entries = state.entries
  const latest = entries.length ? entries[entries.length - 1] : null
  const change = entries.length >= 2 ? entries[entries.length - 1].weight - entries[0].weight : null

  function openForm() {
    setForm({ open: true, date: today(), weight: '', error: null })
  }

  function closeForm() {
    setForm((f) => ({ ...f, open: false, error: null }))
  }

  function save() {
    const weightText = form.weight.trim()
    if (!weightText) {
      setForm((f) => ({ ...f, error: 'Enter a weight greater than 0' }))
      return
    }
    const value = Number(weightText)
    if (!Number.isFinite(value)) {
      setForm((f) => ({ ...f, error: 'Enter a valid weight' }))
      return
    }
    if (value <= 0) {
      setForm((f) => ({ ...f, error: 'Enter a weight greater than 0' }))
      return
    }
    const weight = Math.round(value * 10) / 10
    const date = /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? form.date : today()
    setState(host.addEntry(date, weight))
    setForm({ open: false, date: today(), weight: '', error: null })
  }

  function remove(id: string) {
    setState(host.deleteEntry(id))
  }

  return (
    <main style={{ display: 'block', width: '100%', padding: 'calc(20px * var(--sf))' }}>
      <Card title="Weight Tracker" mono="BODY WEIGHT" accent>
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
              Weight Tracker
            </h1>
            <Body>Log your weight over time and watch the trend.</Body>
          </div>
          {!form.open && (
            <div>
              <Button kind="secondary" onClick={openForm}>
                Add entry
              </Button>
            </div>
          )}

          {form.open && (
            <div
              style={{
                padding: 'calc(14px * var(--sf))',
                border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                borderRadius: 'calc(6px * var(--sf))',
                background: 'var(--ui-bright)',
              }}
            >
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
                    label="Date"
                    value={form.date}
                    onChange={(value) => setForm((f) => ({ ...f, date: value, error: null }))}
                  />
                  <TextInput
                    label="Weight (kg)"
                    value={form.weight}
                    onChange={(value) => setForm((f) => ({ ...f, weight: value, error: null }))}
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
                <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                  <Button kind="primary" onClick={save}>
                    Save
                  </Button>
                  <Button kind="ghost" onClick={closeForm}>
                    Cancel
                  </Button>
                </div>
              </Stack>
            </div>
          )}

          {entries.length === 0 ? (
            <EmptyState title="No entries yet" detail="Log your first weight to see the trend." />
          ) : (
            <>
              <div>
                <MonoLabel sm style={{ color: 'var(--ink-60)' }}>
                  ENTRIES
                </MonoLabel>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 'calc(8px * var(--sf)) 0 0',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(6px * var(--sf))',
                  }}
                >
                  {entries.map((e) => (
                    <li
                      key={e.id}
                      role="listitem"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'calc(10px * var(--sf))',
                        padding: 'calc(8px * var(--sf))',
                        border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                        borderRadius: 'calc(4px * var(--sf))',
                        background: 'var(--ui-bright)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(12px * var(--sf))' }}>
                        <span style={{ font: '400 calc(13px * var(--tf)) var(--mono)', color: 'var(--ink-60)' }}>
                          {e.date}
                        </span>
                        <span style={{ font: '600 calc(15px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>
                          {fmtWeight(e.weight)} kg
                        </span>
                      </div>
                      <Button kind="ghost" onClick={() => remove(e.id)}>
                        Delete {e.date}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              <WeightChart entries={entries} />

              <div
                style={{
                  display: 'flex',
                  gap: 'calc(20px * var(--sf))',
                  padding: 'calc(12px * var(--sf))',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                  borderRadius: 'calc(4px * var(--sf))',
                  background: 'var(--paper-deep)',
                }}
              >
                {latest && (
                  <Body>Latest: {fmtWeight(latest.weight)} kg</Body>
                )}
                {change !== null && (
                  <Body>Change: {fmtWeight(change)} kg</Body>
                )}
              </div>
            </>
          )}
        </Stack>
      </Card>
    </main>
  )
}
