// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, List, PrimaryButton, Rail, Row, Select, Stack } from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { type HistoryEntry } from './host'

interface AppRecord {
  history: HistoryEntry[]
  delimiter: string
}

const DELIMITERS: { value: string; label: string; char: string }[] = [
  { value: 'Comma', label: 'Comma', char: ',' },
  { value: 'Semicolon', label: 'Semicolon', char: ';' },
  { value: 'Tab', label: 'Tab', char: '\t' },
]

function defaultRecord(): AppRecord {
  return { history: [], delimiter: 'Comma' }
}

function escapeCsvField(value: string, delim: string): string {
  if (value === '') return ''
  const needsQuote = value.includes(delim) || value.includes('"') || value.includes('\n')
  if (!needsQuote) return value
  return '"' + value.replace(/"/g, '""') + '"'
}

function jsonToCsv(jsonText: string, delim: string): string {
  const parsed: unknown = JSON.parse(jsonText)
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed]
  if (rows.length === 0) return ''

  const keys: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) continue
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k)
        keys.push(k)
      }
    }
  }
  if (keys.length === 0) return ''

  const header = keys.join(delim)
  const body = rows
    .filter((r) => typeof r === 'object' && r !== null && !Array.isArray(r))
    .map((row) =>
      keys
        .map((k) => {
          const v = row[k]
          if (v === null || v === undefined) return ''
          if (typeof v === 'object') return JSON.stringify(v)
          return String(v)
        })
        .map((f) => escapeCsvField(f, delim))
        .join(delim),
    )
    .join('\n')

  return [header, body].filter((l) => l !== '').join('\n')
}

function parseCsvLine(line: string, delim: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === delim) {
        fields.push(current)
        current = ''
      } else {
        current += c
      }
    }
  }
  fields.push(current)
  return fields.map((f) => f.trim())
}

function csvToJson(csvText: string, delim: string): string {
  const lines = csvText.split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) return ''

  const headers = parseCsvLine(lines[0]!, delim)
  const rows: Record<string, unknown>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!, delim)
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j]!
      if (!key) continue
      const raw = values[j] ?? ''
      if (raw === '') {
        row[key] = null
      } else if (raw === 'true') {
        row[key] = true
      } else if (raw === 'false') {
        row[key] = false
      } else if (raw !== '' && !Number.isNaN(Number(raw))) {
        row[key] = Number(raw)
      } else {
        row[key] = raw
      }
    }
    rows.push(row)
  }
  return JSON.stringify(rows.length === 1 ? rows[0]! : rows)
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<AppRecord>({
    key: 'json-csv.state',
    version: 1,
    defaultValue: defaultRecord(),
  })

  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const history = record.history
  const delimiterValue = record.delimiter
  const delimChar = DELIMITERS.find((d) => d.value === delimiterValue)?.char ?? ','

  function addHistoryEntry(label: string, input: string, output: string) {
    setRecord((prev) => ({
      ...prev,
      history: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label,
          inputText: input,
          outputText: output,
          timestamp: Date.now(),
        },
        ...prev.history,
      ].slice(0, 50),
    }))
  }

  function convertToCsv() {
    const text = inputText.trim()
    if (!text) {
      setError('Paste some data first')
      return
    }
    try {
      const result = jsonToCsv(text, delimChar)
      setOutputText(result)
      setError(null)
      addHistoryEntry('JSON to CSV', text, result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`Invalid JSON: ${msg}`)
    }
  }

  function convertToJson() {
    const text = inputText.trim()
    if (!text) {
      setError('Paste some data first')
      return
    }
    try {
      const result = csvToJson(text, delimChar)
      setOutputText(result)
      setError(null)
      addHistoryEntry('CSV to JSON', text, result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`Invalid CSV: ${msg}`)
    }
  }

  function copyOutput() {
    if (outputText) void copy(outputText)
  }

  function download() {
    if (!outputText) return
    const isCsv = /\n/.test(outputText) && !outputText.trim().startsWith('{') && !outputText.trim().startsWith('[')
    const name = isCsv ? 'output.csv' : 'output.json'
    const mime = isCsv ? 'text/csv' : 'application/json'
    saveBlob(new Blob([outputText], { type: mime }), { filename: name, mimeType: mime })
  }

  function swap() {
    setInputText(outputText)
    setOutputText(inputText)
  }

  function clearAllHistory() {
    setRecord((prev) => ({ ...prev, history: [] }))
  }

  function setDelimiter(v: string) {
    setRecord((prev) => ({ ...prev, delimiter: v }))
  }

  const delimLabel = DELIMITERS.find((d) => d.value === delimiterValue)?.label ?? 'Comma'
  const inputLines = inputText.trim() ? inputText.trim().split('\n').filter((l) => l.trim()).length : 0
  const outputLines = outputText ? outputText.split('\n').filter((l) => l.trim()).length : 0
  const status = error
    ? `Error: ${error}`
    : outputText
      ? `Ready: ${outputLines} output line${outputLines === 1 ? '' : 's'}`
      : inputText.trim()
        ? `Ready: ${inputLines} input line${inputLines === 1 ? '' : 's'} to convert`
        : 'Ready'

  return (
    <AppShell
      name="JSON CSV Converter"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={`${history.length} ${history.length === 1 ? 'entry' : 'entries'}`}
      status={status}
      side={
        <Rail
          title="Converter"
          note={`${delimLabel} delimiter`}
          chips={[
            `${inputLines} input line${inputLines === 1 ? '' : 's'}`,
            `${outputLines} output line${outputLines === 1 ? '' : 's'}`,
            `${history.length} ${history.length === 1 ? 'entry' : 'entries'}`,
          ]}
        >
          <KpiRow>
            <Kpi value={String(history.length)} label="Conversions" />
            <Kpi value={delimLabel} label="Delimiter" />
          </KpiRow>
        </Rail>
      }
    >
      <Stack lg>
        <Card mono="Input" title="Data">
          <CodeArea value={inputText} onChange={setInputText} language="json" ariaLabel="Input data" />
        </Card>

        <Card mono="Settings" title="Options">
          <FormGrid>
            <Select
              label="Delimiter"
              value={delimiterValue}
              onChange={setDelimiter}
              options={DELIMITERS.map((d) => ({ value: d.value, label: d.label }))}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={convertToCsv}>Convert to CSV</PrimaryButton>
            <Button kind="secondary" onClick={convertToJson}>
              Convert to JSON
            </Button>
            <Button kind="secondary" onClick={copyOutput} disabled={!outputText}>
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="secondary" onClick={download} disabled={!outputText}>
              Download
            </Button>
            <Button kind="ghost" onClick={swap} disabled={!outputText}>
              Swap
            </Button>
          </Actions>
          {error ? (
            <p style={{ margin: 'calc(8px * var(--sf)) 0 0', fontSize: 'calc(13px * var(--tf))', color: 'var(--danger, var(--ink))' }} role="alert">
              {error}
            </p>
          ) : null}
        </Card>

        <Card mono="Output" title="Result">
          <CodeArea value={outputText} onChange={setOutputText} language="plain" ariaLabel="Output data" readOnly />
        </Card>

        <Card mono="History" title="Conversions">
          {history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No conversions yet"
              detail="Convert data to see it here."
              actionLabel="Convert data to begin"
            />
          ) : (
            <>
              <List label="Conversions">
                {history.map((h) => (
                  <Row
                    key={h.id}
                    title={h.label}
                    meta={new Date(h.timestamp).toLocaleTimeString()}
                    action={
                      <Button
                        kind="ghost"
                        ariaLabel={`Remove ${h.label} entry`}
                        onClick={() =>
                          setRecord((prev) => ({
                            ...prev,
                            history: prev.history.filter((e) => e.id !== h.id),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    }
                  />
                ))}
              </List>
              <Actions>
                <Button kind="ghost" onClick={clearAllHistory}>
                  Clear history
                </Button>
              </Actions>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
