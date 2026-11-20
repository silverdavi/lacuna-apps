import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, Stack, TextInput } from '@lacuna/ui'
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
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'validation-report.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
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

  return (
    <main>
      <Card mono="Validation">
        <Stack lg>
          <h1 className="lc-title lc-title-lg">JSON Schema Validator</h1>
          <TextInput label="JSON Data" value={data} onChange={setData} rows={6} />
          <TextInput label="Schema" value={schemaText} onChange={setSchemaText} rows={6} />
          <Stack>
            <Button kind="primary" onClick={runValidation}>
              Validate
            </Button>
            {result && result.status === 'pass' && (
              <Button onClick={() => downloadReport(result)}>Download Report</Button>
            )}
          </Stack>
          {!result && <Body>No validation results yet</Body>}
          {result && result.status === 'pass' && <Body>Validation passed</Body>}
          {result && result.status === 'fail' && (
            <Stack>
              <Body>Validation failed</Body>
              <ul>
                {result.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Stack>
          )}
          {result && result.status === 'invalid-data' && <Body>Invalid JSON in data field</Body>}
        </Stack>
      </Card>
    </main>
  )
}
