import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Divider,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import { useClipboard } from '@lacuna/use-clipboard'
import { BeforeAfter } from '@lacuna/before-after'
import { RangeSlider } from '@lacuna/range-slider'
import '@lacuna/image-ops'

interface Persisted {
  quality: string
  width: string
}

interface Source {
  name: string
  url: string
  width: number
  height: number
}

interface Result {
  url: string
  dataUrl: string
  blob: Blob
  width: number
  height: number
  bytes: number
}

const FORMAT_OPTIONS = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
]

const DEFAULT_PERSISTED: Persisted = {
  quality: '85',
  width: '',
}

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

function fileExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'png'
}

function loadUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not load image'))
    img.src = src
  })
}

function canvasSize(w: number, h: number): { w: number; h: number } {
  const width = Math.max(1, Math.round(w))
  const height = Math.max(1, Math.round(h))
  return { w: width, h: height }
}

interface Geometry {
  w: number
  h: number
  drawW: number
  drawH: number
}

function geometryFor(
  w: number,
  h: number,
  rotation: number,
  width: number,
): Geometry {
  const swap = (rotation % 180) === 90
  const baseW = swap ? h : w
  const baseH = swap ? w : h
  const targetW = width > 0 ? width : baseW
  const scale = targetW / baseW
  return {
    w: Math.max(1, Math.round(targetW)),
    h: Math.max(1, Math.round(baseH * scale)),
    drawW: baseW,
    drawH: baseH,
  }
}


async function renderToBlob(
  srcUrl: string,
  rotation: number,
  flip: boolean,
  targetW: number,
  targetH: number,
  mime: string,
  quality: number,
): Promise<{ url: string; dataUrl: string; blob: Blob; bytes: number }> {
  const img = await loadUrl(srcUrl)
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (flip) {
    ctx.translate(targetW, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(img, 0, 0, targetW, targetH)
  const dataUrl = canvas.toDataURL(mime, quality)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode failed'))),
      mime,
      quality,
    )
  })
  const bytes = blob.size
  const url = URL.createObjectURL(blob)
  return { url, dataUrl, blob, bytes }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sourceBytes(url: string): number {
  const i = url.indexOf(',')
  if (i < 0) return 0
  const data = url.slice(i + 1)
  const binary = window.atob(data)
  return binary.length
}

function statusParts(rotation: number, flip: boolean): string[] {
  const parts: string[] = []
  if (flip) parts.push('Flipped: Horizontal')
  parts.push(`Rotation: ${rotation % 360}°`)
  return parts
}

export function App() {
  const [source, setSource] = useState<Source | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [rotation, setRotation] = useState(0)
  const [flip, setFlip] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [format, setFormat] = useState('image/png')
  const { value: persisted, set: setPersisted } = useLocalRecord<Persisted>({
    key: 'image-compressor.options',
    version: 1,
    defaultValue: DEFAULT_PERSISTED,
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const { copy, copied } = useClipboard({ timeoutMs: 2000 })

  const width = Number(persisted.width) || 0
  const quality = Math.min(100, Math.max(0, Number(persisted.quality) || 85))
  const geom = source ? geometryFor(source.width, source.height, rotation, width) : null

  useEffect(() => {
    setSource((prev) => {
      if (!prev || !source) return prev
      if (prev.width === source.width && prev.height === source.height) return prev
      return source
    })
  }, [source])

  const onFile = useCallback((file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onerror = () => setError('Could not read that file')
    reader.onload = () => {
      const url = String(reader.result)
      void (async () => {
        try {
          const img = await loadUrl(url)
          setResult(null)
          setRotation(0)
          setFlip(false)
          setSource({ name: file.name, url, width: img.naturalWidth, height: img.naturalHeight })
        } catch {
          setError('Could not open that image')
        }
      })()
    }
    reader.readAsDataURL(file)
  }, [])

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onFile(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) onFile(file)
  }

  const onBrowse = () => fileRef.current?.click()

  async function compress() {
    if (!source || !geom) return
    setBusy(true)
    setError(null)
    try {
      const { url, dataUrl, blob, bytes } = await renderToBlob(
        source.url,
        rotation,
        flip,
        geom.w,
        geom.h,
        format,
        quality,
      )
      setResult({ url, dataUrl, blob, width: geom.w, height: geom.h, bytes })
    } catch {
      setError('Compression failed')
    } finally {
      setBusy(false)
    }
  }

  function rotate() {
    if (!source) return
    setRotation((r) => (r + 90) % 360)
    setResult(null)
  }

  function flipH() {
    setFlip((f) => !f)
    setResult(null)
  }

  function reset() {
    setPersisted({ ...DEFAULT_PERSISTED })
    setFormat('image/png')
    setRotation(0)
    setFlip(false)
    setResult(null)
    setError(null)
  }

  function download() {
    if (!result || !source) return
    const ext = MIME_EXT[format] ?? fileExt(source.name)
    saveBlob(result.blob, { filename: `compressed.${ext}` })
  }

  async function copyImage() {
    if (!result) return
    try {
      await copy(result.blob)
    } catch {
      // clipboard may be unavailable
    }
  }

  const preview = result?.dataUrl ?? source?.url ?? null
  const previewW = result?.width ?? source?.width ?? 0
  const previewH = result?.height ?? source?.height ?? 0
  const status = source
    ? [
        ...statusParts(rotation, flip),
        result ? `Output: ${result.width}x${result.height}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'No image loaded'

  return (
    <AppShell
      name="Image Compressor"
      icon="paint"
      hue="rust"
      category="Productivity"
      status={status}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <Stack lg>
        {!source ? (
          <Card title="Image">
            <div
              onDrop={onDrop}
              onDragOver={(event) => event.preventDefault()}
              style={{ padding: 'calc(8px * var(--sf))' }}
            >
              <EmptyState
                title={
                  <button
                    type="button"
                    onClick={onBrowse}
                    style={{
                      fontFamily: 'var(--sans)',
                      fontSize: 'inherit',
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Drop an image or click to browse
                  </button>
                }
                detail="PNG or JPEG, kept on this device"
                actionLabel="Browse files"
                onAction={onBrowse}
              />
            </div>
          </Card>
        ) : (
          <Card mono="PREVIEW" title="Image">
            <div
              onDrop={onDrop}
              onDragOver={(event) => event.preventDefault()}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))', alignItems: 'center' }}
            >
              <img
                src={preview ?? undefined}
                alt="Image"
                width={previewW || undefined}
                height={previewH || undefined}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(220px * var(--sf))',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(4px * var(--sf))',
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(13px * var(--tf))',
                  color: 'var(--ink)',
                }}
              >
                <span>{source.name}</span>
                <span style={{ color: 'var(--ink-60)' }}>
                  Original: {source.width}x{source.height}
                </span>
                {result ? (
                  <>
                    <span>Compressed: {result.bytes} B</span>
                    <span>Output: {result.width}x{result.height}</span>
                    <a
                      href={result.url}
                      download={`compressed.${MIME_EXT[format] ?? fileExt(source.name)}`}
                      style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', textDecoration: 'underline' }}
                    >
                      Download compressed.{MIME_EXT[format] ?? fileExt(source.name)}
                    </a>
                  </>
                ) : (
                  <span style={{ color: 'var(--ink-60)' }}>Not compressed yet</span>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card title="Options">
            <FormGrid>
              <Select
                label="Format"
                value={format}
                onChange={setFormat}
                options={FORMAT_OPTIONS}
              />
              <TextInput
                label="Quality"
                type="number"
                inputMode="numeric"
                value={persisted.quality}
                onChange={(v) => setPersisted((prev) => ({ ...prev, quality: v }))}
              />
              <TextInput
                label="Width"
                type="number"
                inputMode="numeric"
                value={persisted.width}
                onChange={(v) => setPersisted((prev) => ({ ...prev, width: v }))}
              />
            </FormGrid>
            <RangeSlider
              label="Compress slider"
              value={quality}
              onChange={(v) => setPersisted((prev) => ({ ...prev, quality: String(v) }))}
              min={1}
              max={100}
              step={1}
              format={(v) => String(v)}
            />
            <Divider />
            <Actions>
              <Button kind="primary" onClick={() => void compress()} disabled={!source}>
                Compress
              </Button>
              <Button kind="secondary" onClick={rotate} disabled={!source}>
                Rotate 90
              </Button>
              <Button kind="secondary" onClick={flipH} disabled={!source}>
                Flip Horizontal
              </Button>
              <Button kind="ghost" onClick={reset}>
                Reset
              </Button>
            </Actions>
          </Card>

        {source && (
          <Card mono="COMPARE" title="Original / Compressed">
            <BeforeAfter
              before={
                <img
                  src={source.url}
                  alt="Original"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              }
              after={
                result ? (
                  <img
                    src={result.url}
                    alt="Compressed"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                ) : null
              }
              ariaLabel="Before and after compression"
            />
          </Card>
        )}

        {source && (
          <Card mono="FILE" title="Output">
            <KpiRow>
              <Kpi value={formatBytes(sourceBytes(source.url))} label="Original size" />
              <Kpi
                value={result ? formatBytes(result.bytes) : '—'}
                label="Compressed size"
                accent={Boolean(result)}
              />
              <Kpi value={result ? `${((result.bytes / sourceBytes(source.url)) * 100).toFixed(0)}%` : '—'} label="Of original" />
            </KpiRow>
            <Divider />
            <Actions>
              <Button kind="primary" onClick={() => void download()} disabled={!result}>
                Save file
              </Button>
              <Button kind="secondary" onClick={() => void copyImage()} disabled={!result}>
                {copied ? 'Copied' : 'Copy image'}
              </Button>
            </Actions>
          </Card>
        )}

        {error ? (
          <p
            role="alert"
            style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}
          >
            {error}
          </p>
        ) : null}
      </Stack>
    </AppShell>
  )
}
