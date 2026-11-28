// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Cols,
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
import { textStats } from '@lacuna/text-stats'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  convertDocument,
  SAMPLE_MARKDOWN,
  type DocInputFormat,
  type DocOutputFormat,
} from './engine/doc'

interface DocState {
  title: string
  input: string
  from: DocInputFormat
  to: DocOutputFormat
}

const DEFAULT_STATE: DocState = {
  title: 'Quarterly Design Brief',
  input: SAMPLE_MARKDOWN,
  from: 'markdown',
  to: 'html',
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<DocState>({
    key: 'doc-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [viewMode, setViewMode] = useState<'Code' | 'Preview'>('Code')
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const result = useMemo(
    () => convertDocument(state.input, state.from, state.to, state.title),
    [state.input, state.from, state.to, state.title],
  )

  const stats = useMemo(() => textStats(state.input), [state.input])

  function download() {
    saveBlob(result.blob, { filename: result.filename, mimeType: result.mime })
  }

  async function onOpenFile(file: File) {
    const text = await file.text()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const from: DocInputFormat =
      ext === 'html' || ext === 'htm'
        ? 'html'
        : ext === 'rtf'
          ? 'rtf'
          : ext === 'txt'
            ? 'txt'
            : 'markdown'
    setState((p) => ({
      ...p,
      title: file.name.replace(/\.[^.]+$/, ''),
      input: text,
      from,
    }))
  }

  const side = (
    <Stack>
      <Rail title="Document" note={`${stats.paragraphs} paragraphs · ${stats.sentences} sentences`}>
        <KpiRow>
          <Kpi value={String(stats.words)} label="Words" accent />
          <Kpi value={String(stats.characters)} label="Chars" />
          <Kpi value={`${Math.max(1, stats.readingTimeMinutes)}m`} label="Read" />
        </KpiRow>
      </Rail>
      <Rail title="Formats">
        <Keys
          items={[
            ['Markup', 'Markdown ↔ HTML'],
            ['Office', 'DOCX (.docx), RTF'],
            ['Print', 'PDF, Plain Text'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Document Converter"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta="MD · HTML · DOCX · RTF · PDF"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.html,.htm,.txt,.rtf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onOpenFile(f)
            e.target.value = ''
          }}
        />

        <Card mono="Settings" title="Conversion">
          <FormGrid>
            <TextInput
              label="Document title"
              value={state.title}
              onChange={(v) => setState((p) => ({ ...p, title: v }))}
              placeholder="Document title"
            />
            <Select
              label="Source format"
              value={state.from}
              onChange={(v) => setState((p) => ({ ...p, from: v as DocInputFormat }))}
              options={[
                { value: 'markdown', label: 'Markdown (.md)' },
                { value: 'html', label: 'HTML (.html)' },
                { value: 'txt', label: 'Plain Text (.txt)' },
                { value: 'rtf', label: 'Rich Text (.rtf)' },
              ]}
            />
            <Select
              label="Target format"
              value={state.to}
              onChange={(v) => setState((p) => ({ ...p, to: v as DocOutputFormat }))}
              options={[
                { value: 'html', label: 'HTML (.html)' },
                { value: 'markdown', label: 'Markdown (.md)' },
                { value: 'txt', label: 'Plain Text (.txt)' },
                { value: 'rtf', label: 'Rich Text (.rtf)' },
                { value: 'docx', label: 'Word (.docx)' },
                { value: 'pdf', label: 'PDF (.pdf)' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={download}>
              Download {result.filename}
            </PrimaryButton>
            <Button kind="secondary" onClick={() => void copy(result.textPreview)}>
              {copied ? 'Copied' : 'Copy output'}
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open file
            </Button>
          </Actions>
        </Card>

        <Cols kind="2">
          <Card mono="Source" title={`Input (${state.from.toUpperCase()})`}>
            <TextInput
              label="Source document"
              value={state.input}
              onChange={(v) => setState((p) => ({ ...p, input: v }))}
              rows={14}
            />
          </Card>

          <Card
            mono="Output"
            title={`Result (${state.to.toUpperCase()})`}
            actions={
              <Actions>
                <Button
                  kind={viewMode === 'Code' ? 'ink' : 'ghost'}
                  onClick={() => setViewMode('Code')}
                >
                  Code
                </Button>
                <Button
                  kind={viewMode === 'Preview' ? 'ink' : 'ghost'}
                  onClick={() => setViewMode('Preview')}
                >
                  Preview
                </Button>
              </Actions>
            }
          >
            {viewMode === 'Code' ? (
              <TextInput
                label="Converted document"
                value={result.textPreview}
                onChange={() => {}}
                rows={14}
              />
            ) : (
              <div
                style={{
                  padding: 'calc(12px * var(--sf))',
                  background: 'var(--paper-deep)',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                  borderRadius: 'calc(2px * var(--sf))',
                  fontSize: 'calc(13.5px * var(--tf))',
                  lineHeight: 1.6,
                }}
                dangerouslySetInnerHTML={{ __html: result.htmlPreview }}
              />
            )}
          </Card>
        </Cols>
      </Stack>
    </AppShell>
  )
}
