// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
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
  DATA_FORMATS,
  parseData,
  SAMPLE_JSON,
  SAMPLE_TABLE,
  serializeData,
  type DataFormat,
} from './engine/formats'

interface StudioState {
  input: string
  from: DataFormat
  to: DataFormat
  minify: boolean
  sortKeys: boolean
}

const DEFAULT_STATE: StudioState = {
  input: SAMPLE_JSON,
  from: 'json',
  to: 'yaml',
  minify: false,
  sortKeys: false,
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<StudioState>({
    key: 'data-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const conversion = useMemo(() => {
    try {
      const parsed = parseData(state.input, state.from)
      const output = serializeData(parsed, state.to, {
        minify: state.minify,
        sortKeys: state.sortKeys,
      })
      return { output, error: null as string | null }
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : 'Parse error' }
    }
  }, [state.input, state.from, state.to, state.minify, state.sortKeys])

  const targetMeta = DATA_FORMATS.find((f) => f.id === state.to)!

  function swap() {
    if (conversion.error) return
    setState((prev) => ({
      ...prev,
      from: prev.to,
      to: prev.from,
      input: conversion.output,
    }))
  }

  function download() {
    if (!conversion.output) return
    saveBlob(new Blob([conversion.output], { type: targetMeta.mime }), {
      filename: `converted.${targetMeta.ext}`,
      mimeType: targetMeta.mime,
    })
  }

  async function onUpload(file: File) {
    const text = await file.text()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const guess: DataFormat =
      ext === 'yml' || ext === 'yaml'
        ? 'yaml'
        : ext === 'toml'
          ? 'toml'
          : ext === 'xml'
            ? 'xml'
            : ext === 'csv'
              ? 'csv'
              : ext === 'tsv'
                ? 'tsv'
                : ext === 'ini'
                  ? 'ini'
                  : ext === 'env'
                    ? 'env'
                    : 'json'
    setState((prev) => ({ ...prev, input: text, from: guess }))
  }

  const side = (
    <Stack>
      <Rail title="Stats" note="Live offline conversion across 9 formats.">
        <KpiRow>
          <Kpi value={String(state.input.length)} label="In chars" accent />
          <Kpi value={String(conversion.output.length)} label="Out chars" />
          <Kpi value={String(conversion.output ? conversion.output.split('\n').length : 0)} label="Lines" />
        </KpiRow>
      </Rail>
      <Rail title="Presets">
        <Stack>
          <Button
            kind="secondary"
            onClick={() => setState((p) => ({ ...p, from: 'json', input: SAMPLE_JSON }))}
          >
            Config JSON sample
          </Button>
          <Button
            kind="secondary"
            onClick={() => setState((p) => ({ ...p, from: 'json', to: 'csv', input: SAMPLE_TABLE }))}
          >
            Table JSON sample
          </Button>
        </Stack>
      </Rail>
      <Rail title="Formats">
        <Keys
          items={[
            ['Config', 'JSON, YAML, TOML, INI, .env'],
            ['Tabular', 'CSV, TSV, Query String'],
            ['Markup', 'XML'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Data Format Studio"
      icon="database"
      hue="blue"
      category="Productivity"
      meta="9 formats"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onUpload(f)
            e.target.value = ''
          }}
        />

        <Card mono="Pipeline" title="Formats & options">
          <FormGrid>
            <Select
              label="Source format"
              value={state.from}
              onChange={(v) => setState((p) => ({ ...p, from: v as DataFormat }))}
              options={DATA_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
            />
            <Select
              label="Target format"
              value={state.to}
              onChange={(v) => setState((p) => ({ ...p, to: v as DataFormat }))}
              options={DATA_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
            />
          </FormGrid>
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', marginTop: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
            <Checkbox
              label="Sort object keys"
              checked={state.sortKeys}
              onChange={(checked) => setState((p) => ({ ...p, sortKeys: checked }))}
            />
            <Checkbox
              label="Minify JSON"
              checked={state.minify}
              onChange={(checked) => setState((p) => ({ ...p, minify: checked }))}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={download} disabled={!conversion.output}>
              Download {targetMeta.label}
            </PrimaryButton>
            <Button kind="secondary" onClick={() => void copy(conversion.output)} disabled={!conversion.output}>
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="secondary" onClick={swap} disabled={Boolean(conversion.error)}>
              Swap formats
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open file
            </Button>
          </Actions>
        </Card>

        {conversion.error ? <ErrorState title="Syntax error" detail={conversion.error} /> : null}

        <Cols kind="2">
          <Card mono="Source" title={`Input (${state.from.toUpperCase()})`}>
            <TextInput
              label="Source data"
              value={state.input}
              onChange={(v) => setState((p) => ({ ...p, input: v }))}
              rows={14}
            />
          </Card>

          <Card mono="Result" title={`Output (${state.to.toUpperCase()})`}>
            <TextInput
              label="Converted data"
              value={conversion.output}
              onChange={() => {}}
              rows={14}
            />
          </Card>
        </Cols>
      </Stack>
    </AppShell>
  )
}
