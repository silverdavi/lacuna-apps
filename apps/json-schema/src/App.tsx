import { useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  List,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveJSON } from '@lacuna/file-save-open'
import { host } from './host'
import type { ValidationState } from './host'
import { validateAgainst } from './validate'

function parseJson(text: string): unknown {
  if (text.trim() === '') return null
  return JSON.parse(text)
}

function downloadReport(state: ValidationState) {
  const report = {
    status: state.status === 'pass' ? 'pass' : 'fail',
    data: state.data,
    schema: state.schema,
    errors: state.errors,
  }
  saveJSON(report, { filename: 'validation-report.json', mimeType: 'application/json' })
}

export function App() {
  const [data, setData] = useState('')
  const [schemaText, setSchemaText] = useState('')
  const [result, setResult] = useState<ValidationState | null>(null)
  const restoredRef = useRef(false)

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const saved = host.loadState()
    if (saved) {
      setData(saved.data)
      setSchemaText(saved.schema)
      setResult(saved)
    }
  }, [])

  const record = (status: ValidationState['status'], errors: string[]) => {
    const next: ValidationState = { data, schema: schemaText, status, errors }
    setResult(next)
    host.saveState(next)
  }

  const runValidation = () => {
    let parsedData: unknown
    let schema: Record<string, unknown>
    try {
      parsedData = parseJson(data)
      schema = (parseJson(schemaText) ?? {}) as Record<string, unknown>
    } catch {
      record('invalid-data', [])
      return
    }
    const errors = validateAgainst(parsedData, schema as never)
    record(errors.length === 0 ? 'pass' : 'fail', errors)
  }

  const status =
    result == null
      ? 'Local · no run yet'
      : result.status === 'pass'
        ? 'Local · passed'
        : result.status === 'fail'
          ? `Local · ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`
          : 'Local · invalid input'

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
        <Rail title="JSON Schema Validator" note="Two fields · local" chips={['Draft-07', 'Report download', 'Works offline']}>
          <Body sm>
            Paste a JSON document and a schema, press Validate, and read the errors. The last
            inputs and result stay on this device.
          </Body>
        </Rail>
      }
    >
      <Card mono="Input" title="Document and schema">
        <FormGrid>
          <TextInput label="JSON Data" value={data} onChange={setData} rows={6} />
          <TextInput label="Schema" value={schemaText} onChange={setSchemaText} rows={6} />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={runValidation}>Validate</Button>
          {result != null && result.status === 'pass' && (
            <Button onClick={() => downloadReport(result)}>Download Report</Button>
          )}
        </Actions>
      </Card>

      <Card mono="Result" title="Validation">
        {result == null && (
          <EmptyState
            mono="Empty"
            title="No validation results yet"
            detail="Paste a document and a schema, then press Validate."
          />
        )}
        {result != null && result.status === 'pass' && <Body>Validation passed</Body>}
        {result != null && result.status === 'invalid-data' && (
          <ErrorState title="Invalid JSON in data field" detail="Fix the JSON Data, then press Validate again." />
        )}
        {result != null && result.status === 'fail' && (
          <Stack>
            <Body>Validation failed</Body>
            <List label="Errors">
              {result.errors.map((error) => (
                <Row key={error} title={error} />
              ))}
            </List>
          </Stack>
        )}
      </Card>
    </AppShell>
  )
}
