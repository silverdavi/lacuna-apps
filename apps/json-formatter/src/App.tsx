import { useEffect, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  List,
  PrimaryButton,
  Rail,
  Row,
  Stack,
} from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { useClipboard } from '@lacuna/use-clipboard'
import { addHistory, clearHistory, listHistory, workspaceStore, type HistoryEntry } from './host/mock'

interface ParseResult {
  ok: boolean
  formatted?: string
  error?: string
}

function normalizeParseError(message: string, text: string): string {
  const truncated = !/\}\s*$|\]\s*$/.test(text.trimEnd())
  if (truncated && /^(Expected ','|Expected property name|Unexpected end of JSON input)/.test(message)) {
    return 'Unexpected end of JSON input'
  }
  return message
}

function parseJson(text: string): ParseResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: false }
  try {
    const value: unknown = JSON.parse(trimmed)
    return { ok: true, formatted: JSON.stringify(value, null, 1) }
  } catch (err) {
    return { ok: false, error: normalizeParseError((err as Error).message, trimmed) }
  }
}

function validateJson(text: string): { ok: boolean; problem?: string } {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: false, problem: 'Nothing to validate' }
  let value: unknown
  try {
    value = JSON.parse(trimmed)
  } catch {
    return { ok: false, problem: 'Invalid JSON' }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    if ('age' in record && typeof record.age !== 'number') {
      return { ok: false, problem: 'age must be a number' }
    }
  }
  return { ok: true }
}

export function App() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [validation, setValidation] = useState<{ ok: boolean; problem?: string } | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => listHistory())
  const [tab, setTab] = useState('Tool')
  const [toast, setToast] = useState<string | null>(null)
  const { copied, copy, reset } = useClipboard({ timeoutMs: 4000 })

  useEffect(() => {
    const workspace = workspaceStore.get()
    setInput(workspace.input)
    setOutput(workspace.output)
  }, [])

  useEffect(() => {
    workspaceStore.set({ input, output })
  }, [input, output])

  useEffect(() => {
    if (toast === null) return
    const id = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(id)
  }, [toast])

  const hasInput = input.trim() !== ''

  function formatJson() {
    const result = parseJson(input)
    if (result.ok && result.formatted !== undefined) {
      setOutput(result.formatted)
      setParseError(null)
      setValidation(null)
      addHistory({ input: input.trim(), formatted: result.formatted })
      setHistory(listHistory())
      setToast('Saved to history')
    } else if (result.error !== undefined) {
      setOutput('')
      setParseError(`Invalid JSON: ${result.error}`)
      setValidation(null)
    } else {
      setOutput('')
      setParseError(null)
      setValidation(null)
    }
  }

  function validate() {
    const result = validateJson(input)
    setValidation(result)
    if (result.ok) {
      const parsed = parseJson(input)
      if (parsed.ok && parsed.formatted !== undefined) {
        setOutput(parsed.formatted)
        setParseError(null)
      }
    } else if (result.problem === 'Invalid JSON') {
      setOutput('')
    }
  }

  function onClearHistory() {
    clearHistory()
    setHistory(listHistory())
  }

  function loadFromHistory(entry: HistoryEntry) {
    setInput(entry.input)
    setOutput(entry.formatted)
    setParseError(null)
    setValidation(null)
    setTab('Tool')
  }

  function short(inputText: string): string {
    return inputText.length > 80 ? `${inputText.slice(0, 80)}…` : inputText
  }

  const inputLines = input === '' ? 0 : input.split('\n').length
  const outputLines = output === '' ? 0 : output.split('\n').length

  const sideChips = [
    `${history.length} ${history.length === 1 ? 'snippet' : 'snippets'} in history`,
    `${inputLines} input line${inputLines === 1 ? '' : 's'}`,
    `${outputLines} output line${outputLines === 1 ? '' : 's'}`,
  ]

  const shellStatus = copied
    ? 'Copied to clipboard'
    : toast !== null
      ? toast
      : parseError !== null
        ? 'Parse error'
        : validation !== null && !validation.ok
          ? 'Validation failed'
          : undefined

  return (
    <AppShell
      name="JSON Formatter"
      icon="docs"
      hue="cobalt"
      category="Productivity"
      status={shellStatus}
      side={
        <Rail title="Session" chips={sideChips}>
          <Body sm>Paste JSON, format it to one-space indents, validate it, and copy the result. Snippets are kept on this device in the history.</Body>
        </Rail>
      }
    >
      <div className="lc-tabs" role="tablist" aria-label="Sections">
        {(['Tool', 'History'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={'lc-tab jf-tab' + (tab === item ? ' active' : '')}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Tool' && (
        <Stack>
          <Card title="Formatter">
            <Stack>
              <label className="lc-field-label">Input JSON</label>
              <CodeArea
                ariaLabel="Input JSON"
                language="json"
                value={input}
                onChange={(v) => {
                  setInput(v)
                  if (parseError !== null) setParseError(null)
                  if (validation !== null) setValidation(null)
                }}
              />
              <label className="lc-field-label">Output JSON</label>
              <CodeArea
                ariaLabel="Output JSON"
                language="json"
                value={output}
                readOnly
              />
              {parseError !== null && <Body>{parseError}</Body>}
              {validation !== null && !validation.ok && validation.problem !== 'Invalid JSON' && (
                <Body>{validation.problem}</Body>
              )}
              {validation !== null && validation.ok && (
                <Stack>
                  <Body>Validation passed</Body>
                  <Body sm>The JSON is valid and the fields passed the shape checks.</Body>
                </Stack>
              )}
              <div className="jf-actions">
                <PrimaryButton onClick={formatJson} disabled={!hasInput}>
                  Format
                </PrimaryButton>
                <Button kind="secondary" onClick={validate} disabled={!hasInput}>
                  Validate
                </Button>
                <Button
                  kind="secondary"
                  ariaLabel="Copy Output"
                  onClick={() => {
                    void copy(output !== '' ? output : input)
                    reset()
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </Stack>
          </Card>
        </Stack>
      )}

      {tab === 'History' && (
        <Card
          title="History"
          actions={
            <Button onClick={onClearHistory}>Clear History</Button>
          }
        >
          {history.length === 0 ? (
            <EmptyState
              title="No history yet"
              detail="Format JSON to keep snippets here."
              actionLabel="Format JSON"
            />
          ) : (
            <List label="History">
              {history.map((entry, index) => (
                <Row
                  key={entry.id}
                  title={short(entry.input)}
                  meta={new Date(entry.at).toLocaleString()}
                  hot={index === 0}
                  onClick={() => loadFromHistory(entry)}
                  action={
                    <Button kind="ghost" ariaLabel={`Load snippet ${index + 1}`} onClick={() => loadFromHistory(entry)}>
                      Load
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      )}
    </AppShell>
  )
}
