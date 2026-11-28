// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Cols,
  ErrorState,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  exportTable,
  parseTableInput,
  SAMPLE_CSV,
  type SheetOutput,
} from './engine/sheet'

interface SheetState {
  input: string
  target: SheetOutput
  tableName: string
}

const DEFAULT_STATE: SheetState = {
  input: SAMPLE_CSV,
  target: 'xlsx',
  tableName: 'products',
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<SheetState>({
    key: 'spreadsheet-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const computed = useMemo(() => {
    try {
      const table = parseTableInput(state.input)
      const exported = exportTable(table, state.target, state.tableName)
      return { table, exported, error: null as string | null }
    } catch (e) {
      return { table: { headers: [], rows: [] }, exported: null, error: e instanceof Error ? e.message : 'Parse error' }
    }
  }, [state])

  const side = (
    <Stack>
      <Rail title="Table" note={`Name: ${state.tableName || 'items'}`}>
        <KpiRow>
          <Kpi value={String(computed.table.rows.length)} label="Rows" accent />
          <Kpi value={String(computed.table.headers.length)} label="Columns" />
        </KpiRow>
      </Rail>
      <Rail title="Targets">
        <Keys
          items={[
            ['Excel', 'Valid OOXML .xlsx'],
            ['Code', 'JSON, SQL INSERT, HTML'],
            ['Text', 'CSV, TSV, Markdown'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Sheet Converter"
      icon="sheets"
      hue="blue"
      category="Productivity"
      meta="XLSX · CSV · SQL · MD"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              void f.text().then((t) =>
                setState((p) => ({ ...p, input: t, tableName: f.name.replace(/\.[^.]+$/, '') })),
              )
            }
            e.target.value = ''
          }}
        />

        {computed.error ? <ErrorState title="Table error" detail={computed.error} /> : null}

        <Card mono="Settings" title="Export target">
          <FormGrid>
            <TextInput
              label="Sheet / table name"
              value={state.tableName}
              onChange={(v) => setState((p) => ({ ...p, tableName: v }))}
              placeholder="products"
            />
            <Select
              label="Output format"
              value={state.target}
              onChange={(v) => setState((p) => ({ ...p, target: v as SheetOutput }))}
              options={[
                { value: 'xlsx', label: 'Excel Workbook (.xlsx)' },
                { value: 'sql', label: 'SQL INSERT (.sql)' },
                { value: 'markdown', label: 'Markdown Table (.md)' },
                { value: 'html', label: 'HTML Table (.html)' },
                { value: 'json', label: 'JSON Array (.json)' },
                { value: 'csv', label: 'CSV (.csv)' },
                { value: 'tsv', label: 'TSV (.tsv)' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton
              disabled={!computed.exported}
              onClick={() => {
                if (computed.exported) {
                  saveBlob(computed.exported.blob, {
                    filename: computed.exported.filename,
                    mimeType: computed.exported.mime,
                  })
                }
              }}
            >
              Download {computed.exported?.filename ?? 'output'}
            </PrimaryButton>
            <Button
              kind="secondary"
              disabled={!computed.exported}
              onClick={() => {
                if (computed.exported) void copy(computed.exported.preview)
              }}
            >
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open CSV / JSON
            </Button>
          </Actions>
        </Card>

        <Cols kind="2">
          <Card mono="Source" title="CSV / TSV / JSON input">
            <TextInput
              label="Table source"
              value={state.input}
              onChange={(v) => setState((p) => ({ ...p, input: v }))}
              rows={12}
            />
          </Card>

          <Card mono="Output" title={`Result (${state.target.toUpperCase()})`}>
            <TextInput
              label="Converted table"
              value={computed.exported?.preview ?? ''}
              onChange={() => {}}
              rows={12}
            />
          </Card>
        </Cols>
      </Stack>
    </AppShell>
  )
}
