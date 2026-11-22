// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { AppShell, Actions, Button, Card, EmptyState, FormGrid, Select, Table, TextInput } from '@lacuna/ui'
import { fromBase, fromRoman, toBase, toRoman } from '@lacuna/codecs'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Base, type Conversion } from './host'

const BASES: Array<{ label: Base; radix: number | null }> = [
  { label: 'Binary', radix: 2 },
  { label: 'Octal', radix: 8 },
  { label: 'Decimal', radix: 10 },
  { label: 'Hexadecimal', radix: 16 },
  { label: 'Roman', radix: null },
]

const ROMAN_MAX = 3999

export function App() {
  const [value, setValue] = useState('')
  const [fromBase, setFromBase] = useState<Base>('Decimal')
  const [toBase, setToBase] = useState<Base>('Hexadecimal')
  const [history, setHistory] = useState<Conversion[]>(() => host.listConversions())
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const trimmed = value.trim()
  const result = convert(trimmed, fromBase, toBase)
  const error = trimmed === '' ? null : result.error

  const historyColumns = [
    { key: 'value', label: 'Value' },
    { key: 'fromBase', label: 'From base' },
    { key: 'result', label: 'Result' },
    { key: 'toBase', label: 'To base' },
  ]

  const historyRows = [...history].reverse().map((c) => ({
    cells: { value: c.value, fromBase: c.fromBase, result: c.result, toBase: c.toBase },
  }))

  function refreshHistory() {
    setHistory(host.listConversions())
  }

  function saveToHistory() {
    if (result.error !== null || trimmed === '') return
    host.addConversion({
      value: trimmed,
      fromBase,
      result: result.value,
      toBase,
      savedAt: Date.now(),
    })
    refreshHistory()
  }

  function clearHistory() {
    host.clearConversions()
    refreshHistory()
  }

  function copyResult() {
    if (result.error !== null || result.value === '') return
    void copy(result.value)
  }

  return (
    <AppShell
      name="Base Converter"
      icon="sheets"
      hue="cobalt"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'conversion' : 'conversions'} saved`}
    >
      <Card mono="Input" title="Base Converter">
        <FormGrid>
          <TextInput
            label="Value"
            value={value}
            onChange={setValue}
            error={error}
            hint="For example 255, 1010, FF or XLII"
          />
          <Select
            label="From base"
            value={fromBase}
            onChange={(v) => setFromBase(v as Base)}
            options={BASES.map((b) => b.label)}
          />
          <Select
            label="To base"
            value={toBase}
            onChange={(v) => setToBase(v as Base)}
            options={BASES.map((b) => b.label)}
          />
        </FormGrid>
        <TextInput
          label="Result"
          value={result.error === null ? result.value : ''}
          onChange={() => undefined}
        />
        <Actions>
          <Button kind="primary" onClick={copyResult} disabled={result.error !== null || result.value === ''}>
            {copied ? 'Copied' : 'Copy result'}
          </Button>
          <Button onClick={saveToHistory} disabled={result.error !== null || result.value === ''}>
            Save to history
          </Button>
        </Actions>
      </Card>

      <Card
        mono={`${history.length} saved`}
        title="History"
        actions={
          <Button onClick={clearHistory} disabled={history.length === 0}>
            Clear history
          </Button>
        }
      >
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No history yet"
            detail="Save a conversion to see it here."
            actionLabel="Save a conversion"
          />
        ) : (
          <Table label="History" columns={historyColumns} rows={historyRows} />
        )}
      </Card>
    </AppShell>
  )
}

function convert(raw: string, from: Base, to: Base): { value: string; error: string | null } {
  const fromInfo = BASES.find((b) => b.label === from)
  const toInfo = BASES.find((b) => b.label === to)
  if (!fromInfo || !toInfo) return { value: '', error: 'Pick a base' }

  if (raw === '') return { value: '', error: null }

  try {
    let decimal: number
    if (fromInfo.radix !== null) {
      if (fromInfo.radix === 16) {
        if (!/^[0-9a-fA-F]+$/.test(raw)) return { value: '', error: 'Hexadecimal digits only (0-9, A-F)' }
        decimal = fromBase(raw, 16)
      } else {
        if (!new RegExp(`^[0-${fromInfo.radix - 1}]+$`).test(raw)) {
          return { value: '', error: `Only ${from} digits are valid` }
        }
        decimal = fromBase(raw, fromInfo.radix)
      }
    } else {
      if (!/^[IVXLCM]+$/.test(raw)) return { value: '', error: 'Roman numerals use I, V, X, L, C, D, M' }
      decimal = fromRoman(raw.toUpperCase())
    }

    if (toInfo.radix !== null) {
      let out = toBase(decimal, toInfo.radix)
      if (toInfo.radix === 16) out = out.toUpperCase()
      return { value: out, error: null }
    }
    if (decimal < 1 || decimal > ROMAN_MAX) return { value: '', error: `Roman numerals cover 1 to ${ROMAN_MAX}` }
    return { value: toRoman(decimal), error: null }
  } catch {
    return { value: '', error: 'That value cannot be converted' }
  }
}
