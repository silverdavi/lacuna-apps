// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, Row, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Conversion } from './host'

const ROMAN_PAIRS: Array<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

function toRoman(n: number): string {
  let out = ''
  for (const [value, numeral] of ROMAN_PAIRS) {
    while (n >= value) {
      out += numeral
      n -= value
    }
  }
  return out
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  if (!/^-?\d+$/.test(value.trim())) return null
  const n = Number.parseInt(value.trim(), 10)
  if (!Number.isInteger(n)) return null
  return n
}

const RANGE_ERROR = 'Enter an integer from 1 to 3999'

export function App() {
  const [number, setNumber] = useState('')
  const [tab, setTab] = useState<'Convert' | 'History'>('Convert')
  const [history, setHistory] = useState<Conversion[]>(() => host.listConversions())
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const n = parseNumber(number)
  const error = n !== null && (n < 1 || n > 3999) ? RANGE_ERROR : null
  const numeral = error === null && n !== null ? toRoman(n) : ''

  useEffect(() => {
    if (numeral === '' || n === null) return
    host.addConversion({ number: n, numeral })
    setHistory(host.listConversions())
  }, [numeral, n])

  function onNumberChange(value: string) {
    setNumber(value)
  }

  function clearHistory() {
    host.clearConversions()
    setHistory(host.listConversions())
  }

  function copyResult() {
    if (!numeral) return
    void copy(numeral)
  }

  return (
    <AppShell
      name="Roman numeral converter"
      icon="docs"
      hue="gold"
      category="Productivity"
      status="Saved on this device"
    >
      <Card mono="Input" title="Roman Numeral Converter">
        <FormGrid>
          <TextInput
            label="Number"
            type="number"
            inputMode="numeric"
            value={number}
            onChange={onNumberChange}
            error={error}
            hint="1 to 3999"
          />
        </FormGrid>
        <TextInput
          label="Roman numeral"
          value={numeral}
          onChange={() => undefined}
        />
        <Actions>
          <Button onClick={copyResult} disabled={numeral === ''}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </Actions>
      </Card>

      <div className="lc-tabs" role="tablist">
        {(['Convert', 'History'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`lc-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'History' && (
        <Card
          mono={`${history.length} saved`}
          title="History"
          actions={
            <Button onClick={clearHistory}>
              Clear history
            </Button>
          }
        >
          {history.length === 0 ? (
            <EmptyState mono="Empty" title="No history yet" detail="Convert a number to see it here." actionLabel="Convert a number" />
          ) : (
            <List label="History">
              {[...history].reverse().map((c) => (
                <Row key={c.id} title={`${c.number} → ${c.numeral}`} />
              ))}
            </List>
          )}
        </Card>
      )}
    </AppShell>
  )
}
