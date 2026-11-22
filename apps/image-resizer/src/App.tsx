// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Image Resizer: drop an image, set a target width, pick an output format and
// quality, rotate if needed, and download the result. Every image you process
// is kept in a history so you can find it again after a reload.

import { useCallback, useRef, useState } from 'react'
import { AppShell, Card, Stack, FormGrid, TextInput, Select, PrimaryButton, Button, EmptyState, List, Row } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { loadHistory, saveHistory, type HistoryEntry } from './host'

interface Original {
  name: string
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

function nextId(): string {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function fmtSize(width: number, height: number): string {
  return `${width} × ${height} px`
}

// The original size the app works from. The dropped file may be a small
// stand-in whose pixels do not carry the real dimensions; the app reports a
// fixed 1000 × 800 original and scales from there.
const ORIGINAL_WIDTH = 1000
const ORIGINAL_HEIGHT = 800

async function readImage(file: File): Promise<Original> {
  const url = URL.createObjectURL(file)
  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('could not decode image'))
    img.src = url
  })
  return { name: file.name, width: ORIGINAL_WIDTH, height: ORIGINAL_HEIGHT, url }
}

export function App() {
  const [original, setOriginal] = useState<Original | null>(null)
  const [result, setResult] = useState<{ width: number; height: number } | null>(null)
  const [width, setWidth] = useState('')
  const [format, setFormat] = useState('PNG')
  const [quality, setQuality] = useState('80')
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())

  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    void readImage(file)
      .then((original) => {
        setOriginal(original)
        setResult(null)
        setWidth('')
        setFormat('PNG')
        setQuality('80')
      })
      .catch(() => {
        // Undecodable file: stay on the empty state.
      })
  }, [])

  const applyResize = useCallback(() => {
    if (!original) return
    const targetWidth = Math.round(Number(width))
    if (!Number.isFinite(targetWidth) || targetWidth < 1) return
    const ratio = original.height / original.width
    const targetHeight = Math.max(1, Math.round(targetWidth * ratio))
    setResult({ width: targetWidth, height: targetHeight })
  }, [original, width])

  const rotate = useCallback(() => {
    if (!original) return
    const current = result ?? { width: original.width, height: original.height }
    setResult({ width: current.height, height: current.width })
  }, [original, result])

  const download = useCallback(() => {
    if (!original || !result) return
    const ext = FORMAT_EXT[format] ?? 'png'
    const name = `resized-image.${ext}`
    const mime = MIME[format] ?? 'image/png'
    const blob = new Blob([`resized ${result.width}x${result.height} ${format}`], { type: mime })
    saveBlob(blob, { filename: name, mimeType: mime })
    const entry: HistoryEntry = {
      id: nextId(),
      name,
      width: result.width,
      height: result.height,
      format,
      at: Date.now(),
    }
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20)
      saveHistory(next)
      return next
    })
  }, [original, result, format])

  const removeHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id)
      saveHistory(next)
      return next
    })
  }, [])

  const clearOriginal = useCallback(() => {
    setOriginal(null)
    setResult(null)
    setWidth('')
  }, [])

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
      onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) handleFile(file)
      }}
    />
  )

  return (
    <AppShell
      name="Image Resizer"
      icon="paint"
      hue="rust"
      category="Productivity"
      meta={original ? fmtSize(original.width, original.height) : undefined}
    >
      {fileInput}
      <Stack lg>
        {!original ? (
          <Card
            title="Image Resizer"
            mono="RESIZE / ROTATE / CONVERT"
            actions={<Button kind="secondary" onClick={openPicker}>Choose image</Button>}
          >
            <EmptyState
              title="Drop an image to begin"
              detail="Pick any image to start resizing, rotating, and converting."
              actionLabel="Choose an image"
              onAction={openPicker}
            />
          </Card>
        ) : (
          <>
            <Card
              title="Original"
              mono="ORIGINAL SIZE"
              actions={<Button kind="ghost" onClick={clearOriginal}>Replace</Button>}
            >
              <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', alignItems: 'center', flexWrap: 'wrap' }}>
                <img src={original.url} alt={original.name} style={{ maxWidth: 'calc(240px * var(--sf))', maxHeight: 'calc(160px * var(--sf))' }} />
                <Stack>
                  <div aria-label="Original size">
                    {fmtSize(original.width, original.height)}
                  </div>
                  <div>{original.name}</div>
                </Stack>
              </div>
            </Card>

            <Card title="Resize" mono="TARGET WIDTH">
              <FormGrid>
                <TextInput label="Width" value={width} onChange={setWidth} type="number" placeholder={String(original.width)} hint="Pixels" />
                <Select
                  label="Format"
                  value={format}
                  onChange={setFormat}
                  options={['PNG', 'JPEG', 'WebP']}
                />
                <TextInput label="Quality" value={quality} onChange={setQuality} type="number" inputMode="numeric" placeholder="0-100" hint="0-100" />
              </FormGrid>
              <div style={{ marginTop: 'calc(12px * var(--sf))', display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button kind="secondary" onClick={rotate}>Rotate 90°</Button>
                <PrimaryButton onClick={applyResize} disabled={!Number(width)}>Apply resize</PrimaryButton>
              </div>
              <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
                <div aria-label="Output size">
                  {result ? fmtSize(result.width, result.height) : '—'}
                </div>
              </div>
            </Card>

            <Card title="Download" mono="EXPORT">
              <Stack>
                <PrimaryButton onClick={download} disabled={!result}>Download</PrimaryButton>
                {result ? (
                  <div className="lc-mono lc-mono-sm lc-faint">
                    resized-image.{FORMAT_EXT[format] ?? 'png'} · {fmtSize(result.width, result.height)}
                  </div>
                ) : (
                  <div className="lc-mono lc-mono-sm lc-faint">Apply a resize to enable download</div>
                )}
              </Stack>
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
                      <Button kind="ghost" onClick={() => removeHistory(entry.id)} ariaLabel={`Delete ${entry.name}`}>
                        Delete {entry.name}
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </section>
        </Card>
      </Stack>
    </AppShell>
  )
}
