// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { clearConversions, type ConversionEntry } from './host'
import {
  buildZip,
  convertFile,
  detectFileFormat,
  formatBytes,
  OUTPUT_FORMATS,
  type ConvertedOutput,
  type DetectedFile,
  type OutputFormat,
} from './engine/convert'

interface ConverterState {
  history: ConversionEntry[]
  lastStatus: string | null
  totalConverted: number
}

interface QueuedFile {
  id: string
  file: File
  detected: DetectedFile
  output: ConvertedOutput | null
}

function defaultState(): ConverterState {
  return { history: [], lastStatus: null, totalConverted: 0 }
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<ConverterState>({
    key: 'file-converter.state',
    version: 2,
    defaultValue: defaultState(),
  })

  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('pdf')
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const history = record.history
  const lastStatus = record.lastStatus
  const convertedItems = queue.filter((q) => q.output !== null)
  const totalInputBytes = queue.reduce((sum, q) => sum + q.file.size, 0)
  const totalOutputBytes = convertedItems.reduce((sum, q) => sum + (q.output?.outputBytes ?? 0), 0)

  async function handleFiles(fileList: FileList | File[]) {
    setError(null)
    const files = Array.from(fileList)
    if (files.length === 0) return

    const nextItems: QueuedFile[] = []
    for (const f of files) {
      const head = new Uint8Array(await f.slice(0, 512).arrayBuffer())
      const detected = detectFileFormat(head, f.name)
      nextItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        detected,
        output: null,
      })
    }
    setQueue(nextItems)
  }

  function onBrowse() {
    fileInputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files)
    }
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files)
    }
  }

  async function convert() {
    if (queue.length === 0 || converting) return
    setConverting(true)
    setError(null)

    try {
      const updated: QueuedFile[] = []
      const newEntries: ConversionEntry[] = []

      for (const item of queue) {
        const out = await convertFile(item.file, outputFormat)
        updated.push({ ...item, output: out })
        newEntries.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          inputName: item.file.name,
          outputName: out.outputName,
          outputFormat,
        })
      }

      setQueue(updated)
      const first = updated[0]!
      const statusText =
        updated.length === 1
          ? `Converted ${first.file.name} to ${first.output!.outputName}`
          : `Converted ${updated.length} files to ${outputFormat.toUpperCase()}`

      setRecord((prev) => ({
        history: [...newEntries, ...prev.history].slice(0, 50),
        lastStatus: statusText,
        totalConverted: prev.totalConverted + newEntries.length,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  function download() {
    if (convertedItems.length === 0) return
    if (convertedItems.length === 1) {
      const out = convertedItems[0]!.output!
      saveBlob(out.blob, { filename: out.outputName, mimeType: out.mime })
      return
    }
    void downloadAllZip()
  }

  async function downloadAllZip() {
    if (convertedItems.length === 0) return
    const entries: Array<{ name: string; data: Uint8Array }> = []
    for (const item of convertedItems) {
      const out = item.output!
      entries.push({
        name: out.outputName,
        data: new Uint8Array(await out.blob.arrayBuffer()),
      })
    }
    const zipBytes = buildZip(entries)
    saveBlob(new Blob([zipBytes as BlobPart], { type: 'application/zip' }), {
      filename: 'converted-files.zip',
      mimeType: 'application/zip',
    })
  }

  function clearHistory() {
    clearConversions()
    setRecord((prev) => ({
      ...prev,
      history: [],
      lastStatus: null,
    }))
  }

  function copyHistory() {
    const lines = history.map((h) => `${h.inputName} \u2192 ${h.outputName}`)
    void copy(lines.join('\n'))
  }

  const sideRail = (
    <Stack>
      <Rail title="Summary" note="Magic-byte format detection and offline conversion.">
        <KpiRow>
          <Kpi value={String(queue.length)} label="Queued" accent />
          <Kpi value={formatBytes(totalInputBytes)} label="Input" />
          <Kpi value={totalOutputBytes > 0 ? formatBytes(totalOutputBytes) : '—'} label="Output" />
        </KpiRow>
      </Rail>
      <Rail title="Shortcuts">
        <Keys
          items={[
            ['Enter', 'Browse files'],
            ['Tab', 'Move controls'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="File Converter"
      icon="files"
      hue="blue"
      category="Productivity"
      meta={`${OUTPUT_FORMATS.length} formats`}
      side={sideRail}
    >
      <Stack lg>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        {error ? <ErrorState title="Conversion failed" detail={error} /> : null}

        <Card mono="Input" title="Files">
          <div
            role="button"
            tabIndex={0}
            onClick={onBrowse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onBrowse()
              }
            }}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(2px * var(--sf))',
              padding: 'calc(24px * var(--sf))',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--paper-deep)',
            }}
          >
            <p style={{ margin: 0, fontSize: 'calc(13.5px * var(--tf))' }}>Drop a file or click to browse</p>
          </div>

          {queue.length > 0 ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <List label="Queued files">
                {queue.map((item) => (
                  <Row
                    key={item.id}
                    title={item.file.name}
                    meta={
                      item.output
                        ? `${item.detected.format} \u2192 ${item.output.outputName} (${formatBytes(item.output.outputBytes)})`
                        : `${item.detected.format} · ${formatBytes(item.file.size)}`
                    }
                    value={
                      <Tag accent={item.output !== null}>
                        {item.output ? 'Done' : item.detected.format}
                      </Tag>
                    }
                    action={
                      item.output ? (
                        <Button
                          kind="ghost"
                          ariaLabel={`Save ${item.output.outputName}`}
                          onClick={() =>
                            saveBlob(item.output!.blob, {
                              filename: item.output!.outputName,
                              mimeType: item.output!.mime,
                            })
                          }
                        >
                          Save
                        </Button>
                      ) : (
                        <Button
                          kind="ghost"
                          ariaLabel={`Remove ${item.file.name}`}
                          onClick={() => setQueue((prev) => prev.filter((q) => q.id !== item.id))}
                        >
                          Remove
                        </Button>
                      )
                    }
                  />
                ))}
              </List>
            </div>
          ) : null}
        </Card>

        <Card mono="Output" title="Convert">
          <FormGrid>
            <Select
              label="Output format"
              value={outputFormat}
              onChange={(v) => setOutputFormat(v as OutputFormat)}
              options={OUTPUT_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={() => void convert()} disabled={queue.length === 0 || converting}>
              {converting ? 'Converting…' : 'Convert'}
            </PrimaryButton>
            <Button kind="secondary" onClick={download} disabled={convertedItems.length === 0}>
              Download
            </Button>
            {convertedItems.length > 1 ? (
              <Button kind="secondary" onClick={() => void downloadAllZip()}>
                Download all (.zip)
              </Button>
            ) : null}
          </Actions>
          {lastStatus ? (
            <p style={{ margin: 'calc(8px * var(--sf)) 0 0', fontSize: 'calc(13px * var(--tf))' }}>{lastStatus}</p>
          ) : null}
        </Card>

        <Card mono="History" title="Conversions">
          {history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No conversions yet"
              detail="Convert a file to see it here."
              actionLabel="Browse for a file"
              onAction={onBrowse}
            />
          ) : (
            <List label="Conversions">
              {history.map((h) => (
                <Row
                  key={h.id}
                  title={`${h.inputName} \u2192 ${h.outputName}`}
                  meta={h.outputFormat.toUpperCase()}
                  action={
                    <Button
                      kind="ghost"
                      ariaLabel={`Remove ${h.inputName} conversion`}
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
          )}
          {history.length > 0 ? (
            <Actions>
              <Button kind="ghost" onClick={copyHistory}>
                {copied ? 'Copied' : 'Copy history'}
              </Button>
              <Button kind="ghost" onClick={clearHistory}>
                Clear history
              </Button>
            </Actions>
          ) : null}
        </Card>
      </Stack>
    </AppShell>
  )
}
