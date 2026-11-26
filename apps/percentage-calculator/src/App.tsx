// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, List, Row, Select, Stack, TextInput } from '@lacuna/ui'
import { useLocalRecord } from '@lacuna/use-local-record'
import { useClipboard } from '@lacuna/use-clipboard'

type Mode = 'What is X% of Y?' | 'What percent is X of Y?' | 'Increase by X%' | 'Decrease by X%'

const MODES: Mode[] = [
  'What is X% of Y?',
  'What percent is X of Y?',
  'Increase by X%',
  'Decrease by X%',
]

interface Entry {
  id: string
  mode: Mode
  percent: number
  base: number
  result: number
  resultText: string
  createdAt: number
}

function fieldsFor(mode: Mode) {
  if (mode === 'What is X% of Y?') return [{ label: 'Percent', key: 'percent' as const }, { label: 'Value', key: 'base' as const }]
  if (mode === 'What percent is X of Y?') return [{ label: 'Part', key: 'percent' as const }, { label: 'Whole', key: 'base' as const }]
  return [{ label: 'Percent', key: 'percent' as const }, { label: 'Original', key: 'base' as const }]
}

function compute(mode: Mode, percent: number, base: number): number {
  if (mode === 'What is X% of Y?') return (percent / 100) * base
  if (mode === 'What percent is X of Y?') return (percent / base) * 100
  if (mode === 'Increase by X%') return base + (base * percent) / 100
  return base - (base * percent) / 100
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 1e6) / 1e6
  return String(rounded)
}

function resultText(mode: Mode, value: number): string {
  return mode === 'What percent is X of Y?' ? `${formatNumber(value)}%` : formatNumber(value)
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function App() {
  const [tab, setTab] = useState<'calculate' | 'history'>('calculate')
  const [mode, setMode] = useState<Mode>('What is X% of Y?')
  const [percent, setPercent] = useState('')
  const [base, setBase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const { value: history, set: setHistory } = useLocalRecord<Entry[]>({ key: 'percentage-calculator-history', version: 1, defaultValue: [] })
  const { copied, copy } = useClipboard()

  const fields = fieldsFor(mode)

  function onMode(next: string) {
    setMode(next as Mode)
    setError(null)
    setEntry(null)
  }

  function calculate() {
    const p = Number(percent)
    const b = Number(base)
    if (percent.trim() === '' || !Number.isFinite(p)) return setError('Enter the first number.')
    if (base.trim() === '' || !Number.isFinite(b)) return setError('Enter the second number.')
    if (mode === 'What percent is X of Y?' && b === 0) return setError('The whole cannot be zero.')
    setError(null)
    const value = compute(mode, p, b)
    const next: Entry = {
      id: makeId(),
      mode,
      percent: p,
      base: b,
      result: value,
      resultText: resultText(mode, value),
      createdAt: Date.now(),
    }
    setEntry(next)
    setHistory((prev) => [next, ...prev].slice(0, 100))
  }

  function removeEntry(id: string) {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <AppShell
      name="Percentage Calculator"
      icon="finance"
      hue="rust"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'entry' : 'entries'}`}
      status="Saved on this device"
    >
      <div role="tablist" aria-label="Sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'calculate'}
          aria-current={tab === 'calculate' ? 'page' : undefined}
          className={tab === 'calculate' ? 'lc-tab active' : 'lc-tab'}
          style={tab === 'calculate' ? undefined : { color: 'var(--ink-60)' }}
          onClick={() => setTab('calculate')}
        >
          Calculate
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          aria-current={tab === 'history' ? 'page' : undefined}
          className={tab === 'history' ? 'lc-tab active' : 'lc-tab'}
          style={tab === 'history' ? undefined : { color: 'var(--ink-60)' }}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {tab === 'calculate' ? (
        <Card mono="Inputs" title="Calculate a percentage">
          <FormGrid>
            <div className="lc-field">
              <span className="lc-field-label" id="pc-mode-label">
                Mode
              </span>
              <select className="lc-input" id="pc-mode" aria-labelledby="pc-mode-label" value={mode} onChange={(e) => onMode(e.target.value)}>
                {MODES.map((m) => (
                  <option key={m} value={m} aria-hidden={m.includes('percent')}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {fields.map((f) => (
              <TextInput
                key={f.key}
                label={f.label}
                value={f.key === 'percent' ? percent : base}
                onChange={(v) => (f.key === 'percent' ? setPercent(v) : setBase(v))}
                type="number"
                inputMode="decimal"
                error={error}
              />
            ))}
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={calculate}>
              Calculate
            </Button>
          </Actions>
        </Card>
      ) : null}

      {tab === 'calculate' && entry && (
        <Card mono="Result" title={entry.mode} accent>
          <Stack>
            <KpiRow>
              <Kpi label="Result" accent value={entry.resultText} />
              <Kpi label="Percent" value={formatNumber(entry.percent)} />
              <Kpi label={entry.mode === 'What is X% of Y?' ? 'Value' : entry.mode === 'What percent is X of Y?' ? 'Whole' : 'Original'} value={formatNumber(entry.base)} />
            </KpiRow>
            <Actions>
              <Button kind="secondary" onClick={() => void copy(entry.resultText)}>
                {copied ? 'Copied' : 'Copy result'}
              </Button>
            </Actions>
          </Stack>
        </Card>
      )}

      {tab === 'history' ? (
        <Card mono={`${history.length} ${history.length === 1 ? 'entry' : 'entries'}`} title="History">
          {history.length === 0 ? (
            <EmptyState mono="Empty" title="No calculations yet" detail="Run a calculation and save it to see it here." actionLabel="Go to Calculate" onAction={() => setTab('calculate')} />
          ) : (
            <List label="Calculations">
              {history.map((e) => (
                <Row
                  key={e.id}
                  title={e.mode}
                  meta={`${formatNumber(e.percent)}% · ${formatNumber(e.base)}`}
                  value={e.resultText}
                  action={
                    <Button kind="ghost" ariaLabel="Delete" title="Delete" onClick={() => removeEntry(e.id)}>
                      Delete
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      ) : null}
    </AppShell>
  )
}
