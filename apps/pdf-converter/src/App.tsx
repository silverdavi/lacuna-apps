// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
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
  buildMultiPagePdf,
  inspectPdfBytes,
  SAMPLE_TEXT,
  type PageSize,
  type PdfInspectResult,
} from './engine/pdf'

interface PdfState {
  title: string
  body: string
  pageSize: PageSize
  fontSize: string
  watermark: string
  includePageNumbers: boolean
}

const DEFAULT_STATE: PdfState = {
  title: 'Architecture Brief',
  body: SAMPLE_TEXT,
  pageSize: 'letter',
  fontSize: '11',
  watermark: '',
  includePageNumbers: true,
}

export function App() {
  const { value: state, set: setState } = useLocalRecord<PdfState>({
    key: 'pdf-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [inspected, setInspected] = useState<PdfInspectResult | null>(null)
  const [inspectName, setInspectName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })
  const fileRef = useRef<HTMLInputElement | null>(null)

  const built = useMemo(
    () =>
      buildMultiPagePdf({
        title: state.title,
        body: state.body,
        pageSize: state.pageSize,
        fontSize: Number(state.fontSize),
        watermark: state.watermark,
        includePageNumbers: state.includePageNumbers,
      }),
    [state],
  )

  function downloadPdf() {
    const slug = (state.title.trim() || 'document').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'document'
    saveBlob(new Blob([built.bytes as BlobPart], { type: 'application/pdf' }), {
      filename: `${slug}.pdf`,
      mimeType: 'application/pdf',
    })
  }

  function inspectGenerated() {
    setError(null)
    setInspectName(`${state.title || 'document'}.pdf`)
    setInspected(inspectPdfBytes(built.bytes))
  }

  async function onPdfUpload(file: File) {
    setError(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setInspectName(file.name)
      setInspected(inspectPdfBytes(bytes))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not inspect PDF')
    }
  }

  function exportExtracted(fmt: 'txt' | 'md' | 'json') {
    if (!inspected) return
    const base = inspectName.replace(/\.pdf$/i, '') || 'extracted'
    const content =
      fmt === 'json'
        ? JSON.stringify({ file: inspectName, version: inspected.version, pages: inspected.pageCount, text: inspected.extractedText }, null, 2)
        : fmt === 'md'
          ? `# ${base}\n\n${inspected.extractedText}\n`
          : inspected.extractedText
    const mime = fmt === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8'
    saveBlob(new Blob([content], { type: mime }), { filename: `${base}.${fmt}`, mimeType: mime })
  }

  const side = (
    <Stack>
      <Rail title="Built PDF" note={`${state.pageSize.toUpperCase()} · ${state.fontSize}pt Helvetica`}>
        <KpiRow>
          <Kpi value={String(built.pageCount)} label="Pages" accent />
          <Kpi value={`${(built.bytes.length / 1024).toFixed(1)} KB`} label="Size" />
        </KpiRow>
      </Rail>
      <Rail title="Capabilities">
        <Keys
          items={[
            ['Create', 'Text / MD → Multi-page PDF'],
            ['Stamp', 'Page numbers & watermark'],
            ['Extract', 'PDF → TXT, MD, JSON'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="PDF Converter"
      icon="pdf"
      hue="blue"
      category="Productivity"
      meta="Create & extract"
      side={side}
    >
      <Stack lg>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onPdfUpload(f)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="PDF error" detail={error} /> : null}

        <Card mono="Create" title="Text to PDF">
          <FormGrid>
            <TextInput
              label="Document title"
              value={state.title}
              onChange={(v) => setState((p) => ({ ...p, title: v }))}
              placeholder="Document title"
            />
            <Select
              label="Page size"
              value={state.pageSize}
              onChange={(v) => setState((p) => ({ ...p, pageSize: v as PageSize }))}
              options={[
                { value: 'letter', label: 'US Letter (612×792)' },
                { value: 'a4', label: 'A4 (595×842)' },
              ]}
            />
            <Select
              label="Font size"
              value={state.fontSize}
              onChange={(v) => setState((p) => ({ ...p, fontSize: v }))}
              options={[
                { value: '10', label: '10 pt' },
                { value: '11', label: '11 pt' },
                { value: '12', label: '12 pt' },
                { value: '14', label: '14 pt' },
              ]}
            />
            <TextInput
              label="Watermark text"
              value={state.watermark}
              onChange={(v) => setState((p) => ({ ...p, watermark: v }))}
              placeholder="Optional (e.g. DRAFT)"
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Include page numbers"
              checked={state.includePageNumbers}
              onChange={(c) => setState((p) => ({ ...p, includePageNumbers: c }))}
            />
          </div>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <TextInput
              label="Document body"
              value={state.body}
              onChange={(v) => setState((p) => ({ ...p, body: v }))}
              rows={9}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={downloadPdf}>Download PDF</PrimaryButton>
            <Button kind="secondary" onClick={inspectGenerated}>
              Inspect built PDF
            </Button>
            <Button kind="ghost" onClick={() => fileRef.current?.click()}>
              Open existing PDF
            </Button>
          </Actions>
        </Card>

        {inspected ? (
          <Card mono="Extract" title={`Inspected: ${inspectName}`}>
            <KpiRow>
              <Kpi value={`PDF ${inspected.version}`} label="Version" />
              <Kpi value={String(inspected.pageCount)} label="Pages" accent />
              <Kpi value={`${(inspected.bytes / 1024).toFixed(1)} KB`} label="Bytes" />
            </KpiRow>
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <TextInput
                label="Extracted text"
                value={inspected.extractedText}
                onChange={() => {}}
                rows={7}
              />
            </div>
            <Actions>
              <Button kind="secondary" onClick={() => exportExtracted('txt')}>
                Export TXT
              </Button>
              <Button kind="secondary" onClick={() => exportExtracted('md')}>
                Export Markdown
              </Button>
              <Button kind="secondary" onClick={() => exportExtracted('json')}>
                Export JSON
              </Button>
              <Button kind="ghost" onClick={() => void copy(inspected.extractedText)}>
                {copied ? 'Copied' : 'Copy text'}
              </Button>
            </Actions>
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  )
}
