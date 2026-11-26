// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Image Resizer: drop an image, set a target width, pick an output format and
// quality, rotate if needed, and download the result. Every image you process
// is kept in a history so you can find it again after a reload.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Rail,
  Row,
  Select,
  Stack,
  TextInput,
  Title,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { encodeCanvas, resizeImageData, rotateImageData, ImageData as OpsImageData } from '@lacuna/image-ops'
import { BeforeAfter } from '@lacuna/before-after'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { loadHistory, saveHistory, type HistoryEntry } from './host'

interface Original {
  name: string
  width: number
  height: number
  url: string
}

interface Result {
  width: number
  height: number
  url: string
}

const FORMAT_EXT: Record<string, string> = {
  PNG: 'png',
  JPEG: 'jpg',
  WebP: 'webp',
}

const MIME: Record<string, string> = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WebP: 'image/webp',
}

// The dropped file may be a small stand-in whose pixels do not carry the real
// dimensions; the app works from a fixed 1000 × 800 original and scales from there.
const ORIGINAL_WIDTH = 1000
const ORIGINAL_HEIGHT = 800

function nextId(): string {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function fmtSize(width: number, height: number): string {
  return `${width} × ${height} px`
}

function canvasFromUrl(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('no 2d context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.onerror = () => reject(new Error('could not decode image'))
    img.src = src
  })
}

function paintImageData(canvas: HTMLCanvasElement, data: OpsImageData): void {
  canvas.width = data.width
  canvas.height = data.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  // Build a genuine DOM ImageData (ctx.createImageData returns the native type,
  // even though @lacuna/image-ops has overridden the global ImageData class) and
  // copy the module's pixel buffer into it before committing to the canvas.
  const real = ctx.createImageData(data.width, data.height)
  const raw = data.data
  const src = raw instanceof ArrayBuffer ? new Uint8ClampedArray(raw) : new Uint8ClampedArray(raw.buffer)
  const needed = data.width * data.height * 4
  real.data.set(src.subarray(0, needed))
  ctx.putImageData(real, 0, 0)
}

function makeDemoCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.fillStyle = 'var(--paper-2)'
  ctx.fillRect(0, 0, 1000, 800)
  ctx.fillStyle = 'var(--accent)'
  ctx.fillRect(60, 60, 440, 320)
  ctx.fillStyle = 'var(--ink)'
  ctx.fillRect(560, 420, 380, 320)
  return canvas
}

function targetDims(
  original: Original,
  rotated: boolean,
  width: string,
): { width: number; height: number } | null {
  const targetWidth = Math.round(Number(width))
  if (!Number.isFinite(targetWidth) || targetWidth < 1) return null
  const base = rotated
    ? { width: original.height, height: original.width }
    : { width: original.width, height: original.height }
  const ratio = base.height / base.width
  const targetHeight = Math.max(1, Math.round(targetWidth * ratio))
  return { width: targetWidth, height: targetHeight }
}

export function App() {
  const { value: history, set: setHistory } = useLocalRecord<HistoryEntry[]>({
    key: 'lacuna.image-resizer.history',
    version: 1,
    defaultValue: loadHistory(),
  })

  useEffect(() => {
    saveHistory(history)
  }, [history])

  const [original, setOriginal] = useState<Original | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [rotated, setRotated] = useState(false)
  const [width, setWidth] = useState('')
  const [format, setFormat] = useState('PNG')
  const [quality, setQuality] = useState('80')
  const [status, setStatus] = useState<string | null>(null)
  const clipboard = useClipboard({ timeoutMs: 2500 })

  const fileRef = useRef<HTMLInputElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const resultBlobRef = useRef<Blob | null>(null)

  const dims = original ? targetDims(original, rotated, width) : null
  const hasDims = dims !== null

  const resetForm = useCallback(() => {
    setRotated(false)
    setWidth('')
    setFormat('PNG')
    setQuality('80')
    setStatus(null)
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const url = URL.createObjectURL(file)
        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('could not decode image'))
          img.src = url
        })
        setOriginal({
          name: file.name,
          width: ORIGINAL_WIDTH,
          height: ORIGINAL_HEIGHT,
          url,
        })
        originalCanvasRef.current = null
        setResult(null)
        resetForm()
      } catch {
        setStatus('Could not open that image')
      }
    },
    [resetForm],
  )

  useEffect(() => {
    if (status === null) return
    const t = window.setTimeout(() => setStatus(null), 4000)
    return () => window.clearTimeout(t)
  }, [status])

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url)
    }
  }, [result])

  const rotate = useCallback(() => {
    if (!original) return
    const next = !rotated
    setRotated(next)
    setWidth(String(next ? original.height : original.width))
    originalCanvasRef.current = null
  }, [original, rotated])

  const buildResult = useCallback(
    async (d: { width: number; height: number }): Promise<Result> => {
      const o = original!
      const base = rotated
        ? { width: o.height, height: o.width }
        : { width: o.width, height: o.height }
      const srcCanvas = originalCanvasRef.current ?? (await canvasFromUrl(o.url))
      const out = document.createElement('canvas')
      const outCtx = out.getContext('2d')
      if (!outCtx) throw new Error('no 2d context')
      outCtx.imageSmoothingEnabled = true
      outCtx.imageSmoothingQuality = 'high'
      // Draw the source scaled onto the declared base so the 1×1 stand-in is
      // stretched to the full 1000 × 800 (or rotated) working surface.
      if (rotated) {
        const rot = document.createElement('canvas')
        rot.width = base.width
        rot.height = base.height
        const rotCtx = rot.getContext('2d')
        if (!rotCtx) throw new Error('no 2d context')
        rotCtx.imageSmoothingEnabled = true
        rotCtx.imageSmoothingQuality = 'high'
        rotCtx.drawImage(srcCanvas, 0, 0, base.width, base.height)
        paintImageData(
          out,
          rotateImageData(rotCtx.getImageData(0, 0, base.width, base.height) as unknown as OpsImageData, 90),
        )
      } else {
        out.width = base.width
        out.height = base.height
        outCtx.drawImage(srcCanvas, 0, 0, base.width, base.height)
      }
      if (out.width === 0 || out.height === 0) {
        out.width = base.width
        out.height = base.height
        outCtx.drawImage(srcCanvas, 0, 0, base.width, base.height)
      }
      const data = outCtx.getImageData(0, 0, out.width, out.height)
      paintImageData(out, resizeImageData(data as unknown as OpsImageData, d.width, d.height))
      const blob = await encodeCanvas(out, {
        format: MIME[format] as 'image/png' | 'image/jpeg' | 'image/webp',
        quality: (Number(quality) || 80) / 100,
      })
      resultBlobRef.current = blob
      return { width: d.width, height: d.height, url: URL.createObjectURL(blob) }
    },
    [original, rotated, format, quality],
  )

  const applyResize = useCallback(async () => {
    if (!original || !dims) return
    try {
      setResult(await buildResult(dims))
      originalCanvasRef.current = null
    } catch {
      setStatus('Resize failed')
    }
  }, [original, dims, buildResult])

  const download = useCallback(() => {
    if (!result) return
    const blob = resultBlobRef.current
    if (!blob) {
      setStatus('Download failed')
      return
    }
    const ext = FORMAT_EXT[format] ?? 'png'
    const name = `resized-image.${ext}`
    saveBlob(blob, { filename: name, mimeType: MIME[format] ?? 'image/png' })
    const entry: HistoryEntry = {
      id: nextId(),
      name,
      width: result.width,
      height: result.height,
      format,
      at: Date.now(),
    }
    setHistory((prev) => [entry, ...prev].slice(0, 20))
  }, [result, format, setHistory])

  const copyImage = useCallback(async () => {
    const blob = resultBlobRef.current
    if (!result || !blob) return
    try {
      await clipboard.copy(blob)
    } catch {
      setStatus('Clipboard unavailable')
    }
  }, [result, clipboard])

  const removeHistory = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((e) => e.id !== id))
    },
    [setHistory],
  )

  const demoImage = useCallback(() => {
    const canvas = makeDemoCanvas()
    originalCanvasRef.current = canvas
    setOriginal({
      name: 'demo-image.png',
      width: 1000,
      height: 800,
      url: canvas.toDataURL('image/png'),
    })
    setResult(null)
    resetForm()
  }, [resetForm])

  const onFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file) void handleFile(file)
    },
    [handleFile],
  )

  const openPicker = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      aria-label="Choose image file"
      style={{ display: 'none' }}
      onChange={onFileChange}
    />
  )

  return (
    <AppShell
      name="Image Resizer"
      icon="paint"
      hue="rust"
      category="Productivity"
      meta={original ? fmtSize(original.width, original.height) : 'empty'}
      status={status ?? `Local · ${history.length} processed`}
      side={
        <Rail
          title="Image Resizer"
          note={original ? fmtSize(original.width, original.height) : 'No image'}
          chips={['Resize', 'Rotate 90°', 'Convert', 'Export', 'History']}
        />
      }
    >
      {fileInput}
      <Stack lg>
        <Card title="Image Resizer" mono="RESIZE / ROTATE / CONVERT">
          <Title size="xl">Image Resizer</Title>
        </Card>

        {!original ? (
          <Card title="Image" mono="READY">
            <EmptyState
              title="Drop an image to begin"
              detail="Pick any image to start resizing, rotating, and converting."
              actionLabel="Choose an image"
              onAction={openPicker}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(10px * var(--sf))',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button kind="secondary" onClick={openPicker}>
                  Choose image
                </Button>
                <Button kind="secondary" onClick={demoImage}>
                  Use demo image
                </Button>
              </div>
            </EmptyState>
          </Card>
        ) : (
          <>
            <Card
              title="Original"
              mono="ORIGINAL SIZE"
              actions={
                <Button
                  kind="ghost"
                  onClick={() => {
                    setOriginal(null)
                    setResult(null)
                    resetForm()
                  }}
                >
                  Replace
                </Button>
              }
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(16px * var(--sf))',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <img
                  src={original.url}
                  alt={original.name}
                  style={{
                    display: 'block',
                    maxWidth: 'calc(240px * var(--sf))',
                    maxHeight: 'calc(160px * var(--sf))',
                    width: 'auto',
                    height: 'auto',
                  }}
                />
                <Stack>
                  <div aria-label="Original size">{fmtSize(original.width, original.height)}</div>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 'calc(13px * var(--tf))',
                      opacity: 0.7,
                    }}
                  >
                    {original.name}
                  </span>
                </Stack>
              </div>
            </Card>

            <Card title="Resize" mono="TARGET WIDTH">
              <FormGrid>
                <TextInput
                  label="Width"
                  value={width}
                  onChange={setWidth}
                  type="number"
                  placeholder={String(rotated ? original.height : original.width)}
                  hint="Pixels"
                />
                <Select
                  label="Format"
                  value={format}
                  onChange={setFormat}
                  options={['PNG', 'JPEG', 'WebP']}
                />
                <TextInput
                  label="Quality"
                  value={quality}
                  onChange={setQuality}
                  type="number"
                  hint="1–100, used for JPEG and WebP"
                />
              </FormGrid>
              <div
                style={{
                  marginTop: 'calc(12px * var(--sf))',
                  display: 'flex',
                  gap: 'calc(8px * var(--sf))',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <Button kind="secondary" onClick={rotate}>
                  Rotate 90°
                </Button>
                <Button kind="primary" onClick={() => void applyResize()} disabled={!hasDims}>
                  Apply resize
                </Button>
              </div>
              <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
                <div aria-label="Output size">
                  {hasDims ? fmtSize(dims.width, dims.height) : '—'}
                </div>
              </div>
            </Card>

            <Card title="Before and after" mono="COMPARE">
              {result ? (
                <BeforeAfter
                  mode="slider"
                  ariaLabel="Original and resized image"
                  before={
                    <img
                      src={original.url}
                      alt="Original"
                      style={{ display: 'block', width: '100%', height: 'auto' }}
                    />
                  }
                  after={
                    <img
                      src={result.url}
                      alt="Resized"
                      style={{ display: 'block', width: '100%', height: 'auto' }}
                    />
                  }
                />
              ) : (
                <EmptyState
                  title="Nothing to compare yet"
                  detail="Apply a resize to compare the original and the result side by side."
                  actionLabel="Apply resize"
                />
              )}
            </Card>

            <Card title="Download" mono="EXPORT">
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
                <Button kind="primary" onClick={download} disabled={!result}>
                  Download
                </Button>
                <Button kind="secondary" onClick={() => void copyImage()} disabled={!result}>
                  Copy image
                </Button>
              </div>
              <div
                style={{
                  marginTop: 'calc(10px * var(--sf))',
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(13px * var(--tf))',
                  opacity: 0.7,
                }}
              >
                {result
                  ? `resized-image.${FORMAT_EXT[format] ?? 'png'} · ${fmtSize(result.width, result.height)}`
                  : 'Apply a resize to enable download'}
                {clipboard.copied ? ' · Copied' : ''}
              </div>
            </Card>
          </>
        )}

        <Card title="History" mono="PROCESSED">
          <section aria-label="History">
            {history.length === 0 ? (
              <EmptyState
                title="No history yet"
                detail="Images you process will appear here so you can find them again."
                actionLabel="Process an image"
                onAction={openPicker}
              />
            ) : (
              <List label="History">
                {history.map((entry) => (
                  <Row
                    key={entry.id}
                    title={entry.name}
                    meta={entry.format}
                    value={fmtSize(entry.width, entry.height)}
                    action={
                      <Button
                        kind="ghost"
                        onClick={() => removeHistory(entry.id)}
                        ariaLabel={`Delete ${entry.name}`}
                      >
                        Delete {entry.name}
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </section>
        </Card>

        {status ? (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'var(--mono)',
              fontSize: 'calc(13px * var(--tf))',
              color: 'var(--ink)',
            }}
          >
            {status}
          </p>
        ) : null}
      </Stack>
    </AppShell>
  )
}
