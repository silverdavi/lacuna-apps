import { useReducer, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  Chip,
  Cols,
  Divider,
  EmptyState,
  ErrorState,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  Rail,
  Row,
  SectionLabel,
  Spread,
  Stack,
  Tag,
} from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { openFile, saveJSON } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host'
import type { ValidationState } from './host'
import { validateAgainst } from './validate'
import './app.css'

const SAMPLE_DATA = `{
  "name": "Alice",
  "age": 25,
  "email": "alice@example.com",
  "roles": ["admin", "editor"],
  "active": true
}`

const SAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number", "minimum": 0, "maximum": 150 },
    "email": { "type": "string" },
    "roles": { "type": "array" },
    "active": { "type": "boolean" }
  },
  "required": ["name", "active"]
}`

const HISTORY_CAP = 20

function parseJson(text: string): unknown {
  if (text.trim() === '') return null
  return JSON.parse(text)
}

function summaryOf(entry: HistoryEntry): string {
  const first = entry.errors[0]
  if (!first) return entry.status === 'pass' ? 'Passed' : 'Failed'
  return first.length > 48 ? `${first.slice(0, 48)}…` : first
}

interface HistoryEntry {
  at: string
  data: string
  schema: string
  status: ValidationState['status']
  errors: string[]
}

function writeHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.slice(0, HISTORY_CAP)
}

export function App() {
  const [initial] = useState(() => host.loadState())
  const [data, setData] = useState(initial?.data ?? '')
  const [schemaText, setSchemaText] = useState(initial?.schema ?? '')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [dataError, setDataError] = useState<string | null>(null)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [dataFile, setDataFile] = useState<string | null>(null)
  const [schemaFile, setSchemaFile] = useState<string | null>(null)
  const [dataOver, setDataOver] = useState(false)
  const [schemaOver, setSchemaOver] = useState(false)
  const { copied, copy } = useClipboard()

  const [result, dispatch] = useReducer(
    (state: ValidationState | null, action: { type: 'set'; value: ValidationState } | { type: 'clear' }) =>
      action.type === 'set' ? action.value : null,
    initial,
  )

  const record = (status: ValidationState['status'], errors: string[]) => {
    const next: ValidationState = { data, schema: schemaText, status, errors }
    dispatch({ type: 'set', value: next })
    host.saveState(next)
    if (status === 'pass' || status === 'fail') {
      setHistory((prev) =>
        writeHistory([
          { at: new Date().toISOString(), data, schema: schemaText, status, errors },
          ...prev,
        ].slice(0, HISTORY_CAP)),
      )
    }
  }

  const runValidation = () => {
    setDataError(null)
    setSchemaError(null)
    let parsedData: unknown
    let schema: Record<string, unknown>
    try {
      parsedData = parseJson(data)
    } catch {
      setDataError('not valid JSON')
      record('invalid-data', [])
      return
    }
    try {
      schema = (parseJson(schemaText) ?? {}) as Record<string, unknown>
    } catch {
      setSchemaError('not valid JSON')
      record('invalid-data', [])
      return
    }
    const errors = validateAgainst(parsedData, schema as never)
    record(errors.length === 0 ? 'pass' : 'fail', errors)
  }

  const loadSample = () => {
    setData(SAMPLE_DATA)
    setSchemaText(SAMPLE_SCHEMA)
    setDataError(null)
    setSchemaError(null)
    setDataFile(null)
    setSchemaFile(null)
  }

  const clearAll = () => {
    setData('')
    setSchemaText('')
    dispatch({ type: 'clear' })
    setDataError(null)
    setSchemaError(null)
    setDataFile(null)
    setSchemaFile(null)
    setHistory(writeHistory([]))
    host.saveState({ data: '', schema: '', status: 'pass', errors: [] })
  }

  const loadHistory = (entry: HistoryEntry) => {
    setData(entry.data)
    setSchemaText(entry.schema)
    dispatch({ type: 'set', value: { data: entry.data, schema: entry.schema, status: entry.status, errors: entry.errors } })
    setDataFile(null)
    setSchemaFile(null)
  }

  const removeHistory = (index: number) => {
    setHistory(writeHistory([...history.slice(0, index), ...history.slice(index + 1)]))
  }

  const downloadReport = (state: ValidationState) => {
    saveJSON(
      { status: state.status === 'pass' ? 'pass' : 'fail', data: state.data, schema: state.schema, errors: state.errors },
      { filename: 'validation-report.json', mimeType: 'application/json' },
    )
  }

  const readInto = async (file: File, target: 'data' | 'schema', setFile: (n: string | null) => void) => {
    const res = await openFile(file, 'text')
    if (!res.ok) {
      if (target === 'data') setDataError(res.error)
      else setSchemaError(res.error)
      return
    }
    const text = res.data as string
    if (target === 'data') {
      setData(text)
      setDataError(null)
      setFile(file.name)
    } else {
      setSchemaText(text)
      setSchemaError(null)
      setFile(file.name)
    }
  }

  const status =
    result == null
      ? 'Local · no run yet'
      : result.status === 'pass'
        ? 'Local · passed'
        : result.status === 'fail'
          ? `Local · ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`
          : 'Local · invalid input'

  const reportText = result ? JSON.stringify(result, null, 2) : ''

  return (
    <AppShell
      name="JSON Schema Validator"
      icon="security"
      hue="blue"
      category="Productivity"
      meta={
        result == null
          ? 'draft-07'
          : result.status === 'pass'
            ? 'pass'
            : result.status === 'fail'
              ? 'failed'
              : 'invalid'
      }
      status={status}
      side={
        <Rail
          title="JSON Schema Validator"
          note="Draft-07 · local"
          chips={['Paste or upload', 'Load sample', 'Report download', 'History', 'Works offline']}
        >
          <Stack>
            <Body sm>
              Paste or upload a JSON document and a schema, press <Tag>Validate</Tag>, and read the
              specific errors, one per rule.
            </Body>
            <Divider />
            <MonoLabel sm>What it checks</MonoLabel>
            <Body sm>
              Type, required fields, string patterns, and numeric minimum and maximum, nested by
              property path.
            </Body>
            <Divider />
            <MonoLabel sm>Stored on this device</MonoLabel>
            <Body sm>
              The last inputs and result, plus up to {HISTORY_CAP} run summaries. Nothing leaves the
              browser.
            </Body>
          </Stack>
        </Rail>
      }
    >
      <Card mono="Input" title="Document and schema">
        <Cols kind="2">
          <Stack>
            <SectionLabel>JSON document</SectionLabel>
            <CodeArea value={data} onChange={setData} language="json" ariaLabel="JSON Data" />
            {dataError && <Body sm>{dataError}</Body>}
            <Stack>
              <Chip>{dataFile ?? 'Typed'}</Chip>
              <div
                className={`js-drop${dataOver ? ' js-drop-hot' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDataOver(true)
                }}
                onDragLeave={() => setDataOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDataOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) void readInto(file, 'data', setDataFile)
                }}
              >
                <input
                  id="js-data-file"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void readInto(file, 'data', setDataFile)
                    e.target.value = ''
                  }}
                />
                <label htmlFor="js-data-file" className="js-drop-label">
                  Drop a .json file, or
                </label>
                <button type="button" className="js-link" onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement).click()}>
                  browse
                </button>
              </div>
            </Stack>
          </Stack>
          <Stack>
            <SectionLabel>Schema</SectionLabel>
            <CodeArea value={schemaText} onChange={setSchemaText} language="json" ariaLabel="Schema" />
            {schemaError && <Body sm>{schemaError}</Body>}
            <Stack>
              <Chip>{schemaFile ?? 'Typed'}</Chip>
              <div
                className={`js-drop${schemaOver ? ' js-drop-hot' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setSchemaOver(true)
                }}
                onDragLeave={() => setSchemaOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setSchemaOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) void readInto(file, 'schema', setSchemaFile)
                }}
              >
                <input
                  id="js-schema-file"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void readInto(file, 'schema', setSchemaFile)
                    e.target.value = ''
                  }}
                />
                <label htmlFor="js-schema-file" className="js-drop-label">
                  Drop a .json file, or
                </label>
                <button type="button" className="js-link" onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement).click()}>
                  browse
                </button>
              </div>
            </Stack>
          </Stack>
        </Cols>
        <Divider />
        <Actions>
          <Button kind="primary" onClick={runValidation}>
            Validate
          </Button>
          <Button onClick={loadSample}>Load Sample</Button>
          <Button onClick={clearAll}>Clear</Button>
        </Actions>
      </Card>

      <Card
        mono="Result"
        title="Validation"
        actions={
          result && (
            <Spread>
              <Button ariaLabel="Copy report" onClick={() => void copy(reportText)}>
                {copied ? 'Copied' : 'Copy report'}
              </Button>
              <Button ariaLabel="Download Report" onClick={() => downloadReport(result)}>
                Download Report
              </Button>
            </Spread>
          )
        }
      >
        {result == null && (
          <EmptyState
            mono="Empty"
            title="No validation results yet"
            detail="Paste a document and a schema, then press Validate."
          />
        )}
        {result != null && result.status === 'pass' && (
          <Stack>
            <KpiRow>
              <Kpi value="Passed" label="Validation" accent />
            </KpiRow>
            <Body>Validation passed</Body>
            <Body sm>
              The document satisfies every rule in the schema. Download the report or copy it to share.
            </Body>
          </Stack>
        )}
        {result != null && result.status === 'invalid-data' && (
          <ErrorState title="Invalid JSON in data field" detail="Fix the JSON Data, then press Validate again." />
        )}
        {result != null && result.status === 'fail' && (
          <Stack>
            <KpiRow>
              <Kpi value={String(result.errors.length)} label="Errors found" />
            </KpiRow>
            <Body>Validation failed</Body>
            <List label="Errors">
              {result.errors.map((error) => (
                <Row key={error} title={error} />
              ))}
            </List>
          </Stack>
        )}
      </Card>

      <Card mono="Run history" title="Recent runs">
        {history.length === 0 ? (
          <Body sm>No runs in this session yet. Each pass or fail is kept for up to {HISTORY_CAP} runs.</Body>
        ) : (
          <Stack>
            {history.map((entry, index) => (
              <Stack key={`${entry.at}-${index}`} style={{ gap: 'calc(2px * var(--sf))' }}>
                <Spread>
                  <MonoLabel sm>{new Date(entry.at).toLocaleString()}</MonoLabel>
                  {entry.status === 'pass' ? <Tag accent>Pass</Tag> : <Tag>Fail</Tag>}
                </Spread>
                <Body sm>{summaryOf(entry)}</Body>
                <Spread>
                  <Button kind="ghost" ariaLabel={`Restore run ${index + 1}`} onClick={() => loadHistory(entry)}>
                    Load
                  </Button>
                  <Button kind="ghost" ariaLabel={`Delete run ${index + 1}`} onClick={() => removeHistory(index)}>
                    Remove
                  </Button>
                </Spread>
              </Stack>
            ))}
          </Stack>
        )}
      </Card>
    </AppShell>
  )
}
