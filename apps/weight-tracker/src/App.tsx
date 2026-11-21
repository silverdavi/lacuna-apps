import { useEffect, useRef, useState } from 'react'
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
  List,
  MonoLabel,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { host } from './host/mock'
import type { WeightEntry } from './host'

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

type FormState = {
  open: boolean
  date: string
  weight: string
  error: string | null
}

export function App() {
  const [state, setState] = useState(() => host.read())
  const [form, setForm] = useState<FormState>({ open: false, date: '', weight: '', error: null })
  const dialogRef = useRef<HTMLDivElement>(null)


  const entries = state.entries
  const latest = entries.length ? entries[entries.length - 1] : null
  const change = entries.length >= 2 ? entries[entries.length - 1].weight - entries[0].weight : null

  useEffect(() => {
    if (!form.open) return
    const first = dialogRef.current?.querySelector<HTMLElement>('input, button')
    first?.focus()
  }, [form.open])

  function openForm() {
    setForm({ open: true, date: today(), weight: '', error: null })
  }

  function closeForm() {
    setForm((f) => ({ ...f, open: false, error: null }))
    document.querySelector<HTMLButtonElement>('.lc-btn.primary')?.focus()
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
    setForm({ open: false, date: '', weight: '', error: null })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') closeForm()
  }

  function remove(id: string) {
    setState(host.deleteEntry(id))
  }

  return (
    <AppShell
      name="Weight Tracker"
      icon="analytics"
      hue="teal"
      category="Personal"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Weight Tracker"
          note="Dated readings · local"
          chips={['Line chart', 'Offline']}
        />
      }
    >
      <Stack lg>
        <Card mono="Entry" title="Add a reading">
          <Body sm>
            Log your weight on a date and watch the trend.
          </Body>
          <Actions>
            <Button kind="primary" onClick={openForm}>
              Add entry
            </Button>
          </Actions>
        </Card>

        <Card mono={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} title="Entries">
          {entries.length === 0 ? (
            <EmptyState mono="Empty" title="No entries yet" detail="Add your first reading to start the trend." />
          ) : (
            <Stack>
              <List label="Entries">
                {entries.map((e) => (
                  <Row
                    key={e.id}
                    title={e.date}
                    value={`${fmtWeight(e.weight)} kg`}
                    action={
                      <Button kind="ghost" ariaLabel={`Delete ${e.date}`} onClick={() => remove(e.id)}>
                        Delete {e.date}
                      </Button>
                    }
                  />
                ))}
              </List>
              <WeightChart entries={entries} />
              <KpiRow>
                {latest && <Kpi value={`Latest: ${fmtWeight(latest.weight)} kg`} label="Most recent reading" accent />}
                {change !== null && <Kpi value={`Change: ${fmtWeight(change)} kg`} label="Since first entry" />}
              </KpiRow>
            </Stack>
          )}
        </Card>
      </Stack>

      {form.open && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--dim-veil)',
            pointerEvents: 'none',
          }}
          onClick={closeForm}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Add a reading"
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              width: 'calc(360px * var(--sf))',
              padding: 'calc(18px * var(--sf))',
              background: 'var(--ui-card)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(6px * var(--sf))',
              boxShadow: 'var(--shadow)',
            }}
          >
            <MonoLabel accent>ADD A READING</MonoLabel>
            <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
              <FormGrid>
                <TextInput
                  label="Date"
                  value={form.date}
                  onChange={(value) => setForm((f) => ({ ...f, date: value, error: null }))}
                />
                <TextInput
                  label="Weight (kg)"
                  value={form.weight}
                  onChange={(value) => setForm((f) => ({ ...f, weight: value, error: null }))}
                  error={form.error}
                />
              </FormGrid>
            </div>
            <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
              <Actions>
                <Button kind="primary" onClick={save}>
                  Save
                </Button>
                <Button kind="ghost" onClick={closeForm}>
                  Cancel
                </Button>
              </Actions>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
