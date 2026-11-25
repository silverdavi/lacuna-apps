// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Select, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

type Category = 'volume' | 'mass' | 'temperature'

const VOLUME: readonly string[] = ['cups', 'tablespoons', 'teaspoons']
const MASS: readonly string[] = ['grams', 'ounces']
const TEMPERATURE: readonly string[] = ['celsius', 'fahrenheit']

const UNITS: { id: string; label: string; category: Category }[] = [
  { id: 'cups', label: 'Cups', category: 'volume' },
  { id: 'tablespoons', label: 'Tablespoons', category: 'volume' },
  { id: 'teaspoons', label: 'Teaspoons', category: 'volume' },
  { id: 'grams', label: 'Grams', category: 'mass' },
  { id: 'ounces', label: 'Ounces', category: 'mass' },
  { id: 'celsius', label: 'Celsius', category: 'temperature' },
  { id: 'fahrenheit', label: 'Fahrenheit', category: 'temperature' },
]

const OZ_PER_GRAM = 0.03527396195

const toBase: Record<string, (value: number) => number> = {
  cups: (v) => v * 16,
  tablespoons: (v) => v,
  teaspoons: (v) => v / 3,
  grams: (v) => v,
  ounces: (v) => v / OZ_PER_GRAM,
  celsius: (v) => v,
  fahrenheit: (v) => ((v - 32) * 5) / 9,
}

const fromBase: Record<string, (value: number) => number> = {
  cups: (v) => v / 16,
  tablespoons: (v) => v,
  teaspoons: (v) => v * 3,
  grams: (v) => v,
  ounces: (v) => v * OZ_PER_GRAM,
  celsius: (v) => v,
  fahrenheit: (v) => (v * 9) / 5 + 32,
}

// Parses "1", "0.5", "1.5" and mixed fractions like "1 1/2" into a number.
function parseAmount(raw: string): number | null {
  const text = raw.trim().replace(/\u00a0|\u2009|\u2007/g, ' ')
  if (!text) return null
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(text)
  if (mixed) {
    const whole = Number(mixed[1])
    const num = Number(mixed[2])
    const den = Number(mixed[3])
    if (den === 0 || num >= den) return null
    return whole + num / den
  }
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

// Whole numbers stay clean ("16"); everything else rounds to 2 decimals ("8.82").
function formatResult(value: number): string {
  return Number.isInteger(value) ? String(value) : Math.round(value * 100) / 100 + ''
}

const categoryOf = (id: string): Category | null =>
  VOLUME.includes(id) ? 'volume' : MASS.includes(id) ? 'mass' : TEMPERATURE.includes(id) ? 'temperature' : null

const unitLabel = (id: string) => UNITS.find((u) => u.id === id)?.label ?? id

interface HistoryEntry {
  amount: string
  from: string
  to: string
  result: string
}

const HISTORY_LIMIT = 20

export function App() {
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('cups')
  const [to, setTo] = useState('tablespoons')
  const [tab, setTab] = useState('convert')

  const { value: history, set: setHistory } = useLocalRecord<HistoryEntry[]>({
    key: 'cooking-converter-history',
    version: 1,
    defaultValue: [],
  })

  const parsed = useMemo(() => parseAmount(amount), [amount])

  const result = useMemo(() => {
    if (parsed === null) return null
    const fromUnit = UNITS.find((u) => u.id === from)
    const toUnit = UNITS.find((u) => u.id === to)
    if (!fromUnit || !toUnit || fromUnit.category !== toUnit.category) return null
    return formatResult(fromBase[to](toBase[from](parsed)))
  }, [parsed, from, to])

  const { copy, copied } = useClipboard({ timeoutMs: 3000 })

  // Auto-save each completed conversion to history (deduplicated against the
  // newest entry so typing the same amount again doesn't stack duplicates).
  useEffect(() => {
    if (result === null) return
    const entry: HistoryEntry = { amount, from, to, result }
    const top = history[0]
    if (top && top.amount === amount && top.from === from && top.to === to && top.result === result) return
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT))
  }, [result, amount, from, to, history, setHistory])

  function copyResult() {
    if (result === null) return
    void copy(`${result} ${unitLabel(to)}`)
  }

  return (
    <AppShell
      name="Cooking Unit Converter"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={history.length > 0 ? `${history.length} ${history.length === 1 ? 'conversion' : 'conversions'}` : 'No history'}
      status={copied ? `Copied ${result} ${unitLabel(to)} to clipboard` : null}
    >
      <div className="cv-tabs" role="tablist" aria-label="Converter sections">
        {(['convert', 'history'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`cv-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {id === 'convert' ? 'Convert' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'convert' ? (
        <Card mono="Units" title="Convert">
          <FormGrid>
            <TextInput label="Amount" value={amount} onChange={setAmount} inputMode="decimal" placeholder="1 1/2" />
            <Select label="From unit" value={from} onChange={setFrom} options={UNITS.map((u) => ({ value: u.id, label: u.label }))} />
            <Select label="To unit" value={to} onChange={setTo} options={UNITS.map((u) => ({ value: u.id, label: u.label }))} />
            <TextInput label="Result" value={result ?? ''} onChange={() => undefined} />
          </FormGrid>
          <Actions>
            <Button kind="ghost" onClick={copyResult} disabled={result === null}>Copy result</Button>
          </Actions>
        </Card>
      ) : (
        <Card mono={`${history.length} kept`} title="History">
          {history.length === 0 ? (
            <EmptyState mono="Empty" title="No conversions yet" detail="Saved conversions will appear here." actionLabel="Start a conversion" onAction={() => setTab('convert')} />
          ) : (
            <>
              <ul className="lk-list" aria-label="Conversions">
                {history.map((entry, index) => {
                  const label = `${entry.amount} ${unitLabel(entry.from)} → ${entry.result} ${unitLabel(entry.to)}`
                  return (
                    <li key={`${entry.amount}-${entry.from}-${entry.to}-${index}`} className="lk-row" aria-label={label}>
                      <span className="lk-row-text"><span className="lk-row-title">{label}</span></span>
                    </li>
                  )
                })}
              </ul>
              <Actions>
                <Button kind="ghost" onClick={() => setHistory([])}>Clear history</Button>
              </Actions>
            </>
          )}
        </Card>
      )}
    </AppShell>
  )
}
