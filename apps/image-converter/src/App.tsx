// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
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
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  convertImage,
  createSampleImageFile,
  formatBytes,
  IMAGE_FORMATS,
  packResultsAsZip,
  type ImageConvertResult,
  type ImageTargetFormat,
} from './engine/image'

interface HistoryRow {
  id: string
  inputName: string
  outputName: string
  dims: string
  delta: string
}

interface PersistedState {
  format: ImageTargetFormat
  quality: string
  scale: string
  rotation: string
  grayscale: boolean
  history: HistoryRow[]
}

const DEFAULT_STATE: PersistedState = {
  format: 'webp',
  quality: '85',
  scale: '1',
  rotation: '0',
  grayscale: false,
  history: [],
}

interface QueuedImage {
  id: string
  file: File
  result: ImageConvertResult | null
}

function deltaLabel(before: number, after: number): string {
  if (before <= 0) return '0%'
  const pct = Math.round(((after - before) / before) * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

export function App() {
  const { value: prefs, set: setPrefs } = useLocalRecord<PersistedState>({
    key: 'image-converter.state',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  const [queue, setQueue] = useState<QueuedImage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const done = queue.filter((q) => q.result !== null)
  const totalIn = queue.reduce((s, q) => s + q.file.size, 0)
  const totalOut = done.reduce((s, q) => s + (q.result?.outputBytes ?? 0), 0)

  function addFiles(files: FileList | File[]) {
    setError(null)
    const list = Array.from(files)
    if (list.length === 0) return
    setQueue((prev) => [
      ...prev,
      ...list.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        result: null,
      })),
    ])
  }

  async function loadSample() {
    setError(null)
    const sample = await createSampleImageFile()
    addFiles([sample])
  }

  async function convertAll() {
    if (queue.length === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const next: QueuedImage[] = []
      const newHist: HistoryRow[] = []
      for (const item of queue) {
        const res = await convertImage(item.file, {
          format: prefs.format,
          quality: Number(prefs.quality) / 100,
          scale: Number(prefs.scale),
          rotation: Number(prefs.rotation) as 0 | 90 | 180 | 270,
          grayscale: prefs.grayscale,
        })
        next.push({ ...item, result: res })
        newHist.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          inputName: item.file.name,
          outputName: res.outputName,
          dims: `${res.width}×${res.height}`,
          delta: deltaLabel(res.inputBytes, res.outputBytes),
        })
      }
      setQueue(next)
      setPrefs((p) => ({ ...p, history: [...newHist, ...p.history].slice(0, 40) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image conversion failed')
    } finally {
      setBusy(false)
    }
  }

  async function downloadZip() {
    const results = done.map((d) => d.result!).filter(Boolean)
    if (results.length === 0) return
    const zip = await packResultsAsZip(results)
    saveBlob(zip, { filename: 'converted-images.zip', mimeType: 'application/zip' })
  }

  const side = (
    <Stack>
      <Rail title="Savings" note="Batch byte totals before and after encoding.">
        <KpiRow>
          <Kpi value={String(queue.length)} label="Images" accent />
          <Kpi value={formatBytes(totalIn)} label="Input" />
          <Kpi value={totalOut > 0 ? deltaLabel(totalIn, totalOut) : '—'} label="Delta" />
        </KpiRow>
      </Rail>
      <Rail title="Formats">
        <Keys
          items={[
            ['PNG / WebP', 'Lossless or web'],
            ['QOI / BMP', 'Pure-TS encoders'],
            ['ICO / SVG', 'Icons & wrappers'],
          ]}
        />
      </Rail>
    </Stack>
  )

  return (
    <AppShell
      name="Image Converter"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta="8 output formats"
      side={side}
    >
      <Stack lg>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {error ? <ErrorState title="Conversion error" detail={error} /> : null}

        <Card mono="Input" title="Images">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(2px * var(--sf))',
              padding: 'calc(20px * var(--sf))',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--paper-deep)',
            }}
          >
            <p style={{ margin: 0, fontSize: 'calc(13.5px * var(--tf))' }}>
              Drop images or click to browse
            </p>
          </div>
          <Actions>
            <Button kind="secondary" onClick={() => void loadSample()}>
              Load sample image
            </Button>
            {queue.length > 0 ? (
              <Button kind="ghost" onClick={() => setQueue([])}>
                Clear queue
              </Button>
            ) : null}
          </Actions>

          {queue.length > 0 ? (
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <List label="Image queue">
                {queue.map((q) => (
                  <Row
                    key={q.id}
                    title={q.file.name}
                    meta={
                      q.result
                        ? `${q.result.outputName} · ${q.result.width}×${q.result.height} · ${formatBytes(q.result.outputBytes)} (${deltaLabel(q.result.inputBytes, q.result.outputBytes)})`
                        : formatBytes(q.file.size)
                    }
                    value={<Tag accent={q.result !== null}>{q.result ? prefs.format.toUpperCase() : 'Queued'}</Tag>}
                    action={
                      q.result ? (
                        <Button
                          kind="ghost"
                          onClick={() =>
                            saveBlob(q.result!.blob, {
                              filename: q.result!.outputName,
                              mimeType: q.result!.mime,
                            })
                          }
                        >
                          Download
                        </Button>
                      ) : (
                        <Button kind="ghost" onClick={() => setQueue((prev) => prev.filter((x) => x.id !== q.id))}>
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

        <Card mono="Settings" title="Encode">
          <FormGrid>
            <Select
              label="Output format"
              value={prefs.format}
              onChange={(v) => setPrefs((p) => ({ ...p, format: v as ImageTargetFormat }))}
              options={IMAGE_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
            />
            <Select
              label="Quality"
              value={prefs.quality}
              onChange={(v) => setPrefs((p) => ({ ...p, quality: v }))}
              options={[
                { value: '100', label: '100% (Max)' },
                { value: '90', label: '90% (High)' },
                { value: '85', label: '85% (Balanced)' },
                { value: '70', label: '70% (Compact)' },
                { value: '50', label: '50% (Small)' },
              ]}
            />
            <Select
              label="Scale"
              value={prefs.scale}
              onChange={(v) => setPrefs((p) => ({ ...p, scale: v }))}
              options={[
                { value: '1', label: '100% (Original)' },
                { value: '0.75', label: '75%' },
                { value: '0.5', label: '50%' },
                { value: '0.25', label: '25%' },
              ]}
            />
            <Select
              label="Rotation"
              value={prefs.rotation}
              onChange={(v) => setPrefs((p) => ({ ...p, rotation: v }))}
              options={[
                { value: '0', label: '0°' },
                { value: '90', label: '90° clockwise' },
                { value: '180', label: '180°' },
                { value: '270', label: '270° clockwise' },
              ]}
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Checkbox
              label="Convert to grayscale"
              checked={prefs.grayscale}
              onChange={(checked) => setPrefs((p) => ({ ...p, grayscale: checked }))}
            />
          </div>
          <Actions>
            <PrimaryButton onClick={() => void convertAll()} disabled={queue.length === 0 || busy}>
              {busy ? 'Encoding…' : 'Convert images'}
            </PrimaryButton>
            <Button kind="secondary" onClick={() => void downloadZip()} disabled={done.length === 0}>
              Download all (.zip)
            </Button>
          </Actions>
        </Card>

        <Card mono="History" title="Recent runs">
          {prefs.history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No images converted yet"
              detail="Load a sample image or drop your own to convert."
              actionLabel="Load sample image"
              onAction={() => void loadSample()}
            />
          ) : (
            <>
              <List label="Conversion history">
                {prefs.history.map((h) => (
                  <Row
                    key={h.id}
                    title={`${h.inputName} \u2192 ${h.outputName}`}
                    meta={`${h.dims} · ${h.delta}`}
                  />
                ))}
              </List>
              <Actions>
                <Button kind="ghost" onClick={() => setPrefs((p) => ({ ...p, history: [] }))}>
                  Clear history
                </Button>
              </Actions>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
