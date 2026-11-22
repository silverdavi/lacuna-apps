// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useRef, useState, type ChangeEvent } from 'react'
import { AppShell, Actions, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, Rail, Select, Table, TextInput } from '@lacuna/ui'
import { fromBase, fromRoman, toBase, toRoman } from '@lacuna/codecs'
import { useClipboard } from '@lacuna/use-clipboard'
import { openFile, saveJSON, saveText } from '@lacuna/file-save-open'
import { host, type Base, type Conversion } from './host'

const BASES: Array<{ label: Base; radix: number | null; hint: string }> = [
  { label: 'Binary', radix: 2, hint: 'digits 0–1' },
  { label: 'Octal', radix: 8, hint: 'digits 0–7' },
  { label: 'Decimal', radix: 10, hint: 'digits 0–9' },
  { label: 'Hexadecimal', radix: 16, hint: 'digits 0–9, A–F' },
  { label: 'Roman', radix: null, hint: 'I V X L C D M' },
]

const ROMAN_MAX = 3999

function isValidConversion(c: unknown): c is Conversion {
  const o = c as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.value === 'string' &&
    typeof o.result === 'string' &&
    typeof o.savedAt === 'number' &&
    BASES.some((b) => b.label === o.fromBase) &&
    BASES.some((b) => b.label === o.toBase)
  )
}

function toCsv(rows: Conversion[]): string {
  const header = 'value,fromBase,result,toBase,savedAt'
  const lines = rows.map((r) => [r.value, r.fromBase, r.result, r.toBase, r.savedAt].map(csvCell).join(','))
  return [header, ...lines].join('\n')
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function App() {
  const [value, setValue] = useState('')
  const [fromBase, setFromBase] = useState<Base>('Decimal')
  const [toBase, setToBase] = useState<Base>('Hexadecimal')
  const [history, setHistory] = useState<Conversion[]>(() => host.listConversions())
  const [importError, setImportError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement>(null)

  const trimmed = value.trim()
  const result = convert(trimmed, fromBase, toBase)
  const error = trimmed === '' ? null : result.error
  const hasResult = result.error === null && result.value !== ''

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

  function exportJSON() {
    saveJSON(history, { filename: 'base-converter-history.json', mimeType: 'application/json' })
  }

  function exportCSV() {
    saveText(toCsv(history), { filename: 'base-converter-history.csv', mimeType: 'text/csv' })
  }

  async function onImportFile(file: File) {
    setImportError(null)
    setImportedCount(null)
    const res = await openFile(file, 'json')
    if (!res.ok) {
      setImportError(res.error)
      return
    }
    const data = res.data
    const arr = Array.isArray(data) ? data : null
    if (!arr) {
      setImportError('Expected a JSON array of conversions')
      return
    }
    let added = 0
    for (const item of arr) {
      if (!isValidConversion(item)) continue
      const c = item as Conversion
      try {
        host.addConversion({
          value: c.value,
          fromBase: c.fromBase,
          result: c.result,
          toBase: c.toBase,
          savedAt: c.savedAt,
        })
        added += 1
      } catch {
        // Skip duplicates / malformed entries silently.
      }
    }
    setImportedCount(added)
    refreshHistory()
  }

  function triggerImport() {
    fileRef.current?.click()
  }

  function onImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void onImportFile(file)
  }

  const distinctBaseCount = new Set(history.map((c) => `${c.fromBase}→${c.toBase}`)).size

  return (
    <AppShell
      name="Base Converter"
      icon="sheets"
      hue="cobalt"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'conversion' : 'conversions'} saved`}
      side={
        <>
          <Rail title="At a glance" note={`${BASES.length} bases`}>
            <KpiRow>
              <Kpi value={history.length} label="Saved" />
              <Kpi value={distinctBaseCount} label="Base pairs" />
              <Kpi value={hasResult ? 'Live' : '—'} label="Result" accent={hasResult} />
            </KpiRow>
          </Rail>
          <Rail title="Files" note="JSON · CSV">
            <Actions>
              <Button kind="primary" onClick={exportJSON} disabled={history.length === 0}>
                Export JSON
              </Button>
              <Button onClick={exportCSV} disabled={history.length === 0}>
                Export CSV
              </Button>
              <Button onClick={triggerImport}>Import JSON</Button>
            </Actions>
            {importError && (
              <p style={{ margin: 'calc(8px * var(--sf)) 0 0', color: 'var(--ink)', fontWeight: 500 }} role="alert">
                Import failed: {importError}
              </p>
            )}
            {importedCount !== null && !importError && (
              <p style={{ margin: 'calc(8px * var(--sf)) 0 0', color: 'var(--ink-60)' }} role="status">
                Imported {importedCount} {importedCount === 1 ? 'conversion' : 'conversions'}.
              </p>
            )}
          </Rail>
          <Rail title="Bases" note="Digits allowed">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {BASES.map((b) => (
                <li key={b.label} style={{ padding: 'calc(4px * var(--sf)) 0', color: 'var(--ink-60)', fontSize: 'calc(13px * var(--sf))' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{b.label}</span> · {b.hint}
                </li>
              ))}
            </ul>
          </Rail>
        </>
      }
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
          value={hasResult ? result.value : ''}
          onChange={() => undefined}
        />
        <Actions>
          <Button kind="primary" onClick={copyResult} disabled={!hasResult}>
            {copied ? 'Copied' : 'Copy result'}
          </Button>
          <Button onClick={saveToHistory} disabled={!hasResult}>
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

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={onImportChange}
        aria-hidden
      />
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
