// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, Select, Stack } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { clearConversions, type ConversionEntry } from './host'

interface ConverterState {
  history: ConversionEntry[]
  lastStatus: string | null
}

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
}

function defaultState(): ConverterState {
  return { history: [], lastStatus: null }
}

function mimeFor(format: string): string {
  return MIME_MAP[format] ?? 'application/octet-stream'
}

function outputNameFor(inputName: string, format: string): string {
  return inputName.replace(/\.[^.]+$/, '') + '.' + format
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<ConverterState>({
    key: 'file-converter.state',
    version: 1,
    defaultValue: defaultState(),
  })

  const [loadedFile, setLoadedFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState('pdf')
  const [converting, setConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const history = record.history
  const lastStatus = record.lastStatus

  function handleFile(file: File) {
    setLoadedFile(file)
  }

  function onBrowse() {
    fileInputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function convert() {
    if (!loadedFile || converting) return
    setConverting(true)

    const outputName = outputNameFor(loadedFile.name, outputFormat)

    const entry: ConversionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inputName: loadedFile.name,
      outputName,
      outputFormat,
    }

    setRecord((prev) => ({
      history: [entry, ...prev.history].slice(0, 50),
      lastStatus: `Converted ${loadedFile.name} to ${outputName}`,
    }))

    setConverting(false)
  }

  function download() {
    if (!lastStatus || !loadedFile) return
    const match = lastStatus.match(/^Converted (.+) to (.+)$/)
    if (!match) return
    const outputName = match[2]
    const format = outputName.split('.').pop() ?? 'pdf'

    void (async () => {
      try {
        const buffer = await loadedFile.arrayBuffer()
        const blob = new Blob([buffer], { type: mimeFor(format) })
        saveBlob(blob, { filename: outputName, mimeType: mimeFor(format) })
      } catch {
        // download failed
      }
    })()
  }

  function clearHistory() {
    clearConversions()
    setRecord((prev) => ({
      history: [],
      lastStatus: null,
    }))
  }

  function copyHistory() {
    const lines = history.map((h) => `${h.inputName} \u2192 ${h.outputName}`)
    void copy(lines.join('\n'))
  }

  return (
    <AppShell
      name="File Converter"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta="Offline"
    >
      <Stack lg>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        <Card mono="Input" title="File">
          <div
            role="button"
            tabIndex={0}
            onClick={onBrowse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onBrowse()
            }}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(2px * var(--sf))',
              padding: 'calc(24px * var(--sf))',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            {loadedFile ? (
              <p style={{ margin: 0, fontSize: 'calc(14px * var(--tf))' }}>{loadedFile.name}</p>
            ) : (
              <p style={{ margin: 0, fontSize: 'calc(14px * var(--tf))' }}>Drop a file or click to browse</p>
            )}
          </div>
        </Card>

        <Card mono="Output" title="Convert">
          <FormGrid>
            <Select
              label="Output format"
              value={outputFormat}
              onChange={setOutputFormat}
              options={[
                { value: 'pdf', label: 'PDF' },
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPG' },
              ]}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={convert} disabled={!loadedFile || converting}>
              Convert
            </PrimaryButton>
            <Button kind="secondary" onClick={download} disabled={!lastStatus}>
              Download
            </Button>
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
