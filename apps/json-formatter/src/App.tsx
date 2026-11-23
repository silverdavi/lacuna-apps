import { useEffect, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  List,
  PrimaryButton,
  Row,
  Stack,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { addHistory, clearHistory, listHistory, workspaceStore, type HistoryEntry } from './host/mock'

interface ParseResult {
  ok: boolean
  formatted?: string
  error?: string
}

// V8's message for a truncated object (e.g. `{"name":"Alice"`) is
// "Expected ',' or '}' after property value ...", but the spec (and older
// engines) phrase a cut-off JSON document as "Unexpected end of JSON input".
// Normalise the truncated-object / truncated-stream forms to that wording.
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

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

const EDITOR_STYLE: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(14px * var(--tf))',
  lineHeight: 'calc(20px * var(--tf))',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
  color: 'var(--ink)',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 'calc(120px * var(--sf))',
}

export function App() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [validation, setValidation] = useState<{ ok: boolean; problem?: string } | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => listHistory())
  const [tab, setTab] = useState('Tool')
  const { copied, copy, reset } = useClipboard({ timeoutMs: 4000 })

  useEffect(() => {
    const workspace = workspaceStore.get()
    setInput(workspace.input)
    setOutput(workspace.output)
  }, [])

  useEffect(() => {
    workspaceStore.set({ input, output })
  }, [input, output])

  const hasInput = input.trim() !== ''

  function onInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setInput(event.target.value)
  }

  function formatJson() {
    const result = parseJson(input)
    if (result.ok && result.formatted !== undefined) {
      setOutput(result.formatted)
      setParseError(null)
      setValidation(null)
      addHistory({ input: input.trim(), formatted: result.formatted })
      setHistory(listHistory())
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

  return (
    <AppShell
      name="JSON Formatter"
      icon="docs"
      hue="cobalt"
      category="Productivity"
      status={copied ? 'Copied to clipboard' : undefined}
    >
      <div className="lc-tabs" role="tablist" aria-label="Sections">
        {(['Tool', 'History'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={cx('lc-tab', 'jf-tab', tab === item && 'active')}
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
              <label className="lc-field-label" htmlFor="jf-input">
                Input JSON
              </label>
              <textarea
                id="jf-input"
                className="lc-input"
                value={input}
                onChange={onInputChange}
                spellCheck={false}
                style={EDITOR_STYLE}
              />
              <label className="lc-field-label" htmlFor="jf-output">
                Output JSON
              </label>
              <textarea
                id="jf-output"
                className="lc-input"
                value={output}
                readOnly
                spellCheck={false}
                style={EDITOR_STYLE}
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
                  onClick={() => void copy(output !== '' ? output : input)}
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
