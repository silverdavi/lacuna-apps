import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
} from '@lacuna/ui'
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL(type, quality)
      const base64 = dataUrl.split(',')[1]
      const byteString = atob(base64)
      const bytes = new Uint8Array(byteString.length)
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i)
      }
      resolve(new Blob([bytes], { type }))
    } catch (err) {
      reject(err)
    }
  })
}
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'

interface GeneratedBlob {
  name: string
  blob: Blob
}

interface FaviconSet {
  version: 1
  fileName: string
  dataUrl: string
  appliedShape: 'none' | 'square' | 'circle'
  appliedQuality: number
  preview: string
  generated: GeneratedBlob[]
  updatedAt: number
}

const SIZES = [16, 32, 48, 64, 128, 192, 256, 512] as const

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image'))
    img.src = src
  })
}

function paintShape(ctx: CanvasRenderingContext2D, size: number, shape: 'none' | 'square' | 'circle') {
  if (shape === 'circle') {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<FaviconSet | null>({
    key: 'favicon-generator:latest-set',
    version: 1,
    defaultValue: null,
  })
  const [fileName, setFileName] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [shape, setShape] = useState<'none' | 'square' | 'circle'>('none')
  const [quality, setQuality] = useState('90')
  const [preview, setPreview] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedBlob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!record?.fileName || !record.dataUrl) return
    setFileName(record.fileName)
    setDataUrl(record.dataUrl)
    setShape(record.appliedShape)
    setQuality(String(record.appliedQuality))
    setPreview(record.preview)
    setGenerated(record.generated)
  }, [record])

  useEffect(() => {
    if (!preview || !fileName) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const canvas = previewCanvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.onerror = () => {
      if (cancelled) return
      const canvas = previewCanvasRef.current
      if (!canvas) return
      canvas.width = 1
      canvas.height = 1
    }
    img.src = preview
    return () => { cancelled = true }
  }, [preview, fileName])

  async function renderSet(img: HTMLImageElement, appliedShape: 'none' | 'square' | 'circle', appliedQuality: number) {
    const results: GeneratedBlob[] = []
    const previewCanvas = document.createElement('canvas')
    const previewScale = Math.min(1, 256 / Math.max(img.width, img.height))
    previewCanvas.width = Math.max(1, Math.round(img.width * previewScale))
    previewCanvas.height = Math.max(1, Math.round(img.height * previewScale))
    const pctx = previewCanvas.getContext('2d')
    if (!pctx) throw new Error('Canvas is unavailable in this browser')
    pctx.imageSmoothingEnabled = true
    pctx.imageSmoothingQuality = 'high'
    pctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height)
    paintShape(pctx, previewCanvas.width, appliedShape)
    // destination-in can leave a fully-opaque row or column at the edge of
    // the inscribed circle; clear the two outermost rows and columns so the
    // circle is unambiguously transparent at its corners.
    const pw = previewCanvas.width
    const ph = previewCanvas.height
    pctx.clearRect(0, 0, pw, 1)
    pctx.clearRect(0, ph - 1, pw, 1)
    pctx.clearRect(0, 0, 1, ph)
    pctx.clearRect(pw - 1, 0, 1, ph)
    const previewUrl = previewCanvas.toDataURL('image/png')
    for (const size of SIZES) {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is unavailable in this browser')
      const scale = size / Math.max(img.width, img.height)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)))
      paintShape(ctx, size, appliedShape)
      const blob = await canvasToBlob(canvas, 'image/png')
      results.push({ name: `favicon-${size}x${size}.png`, blob })
    }
    return { results, previewUrl }
  }

  function persist(payload: Omit<FaviconSet, 'updatedAt'>) {
    setRecord({ ...payload, updatedAt: Date.now() })
  }

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Drop an image file (PNG, JPEG, or WebP).')
      return
    }
    try {
      const url = await blobToDataUrl(file)
      const img = await loadImage(url)
      const { results, previewUrl } = await renderSet(img, 'none', 90)
      setFileName(file.name)
      setDataUrl(url)
      setShape('none')
      setQuality('90')
      setPreview(previewUrl)
      setGenerated(results)
      persist({
        version: 1,
        fileName: file.name,
        dataUrl: url,
        appliedShape: 'none',
        appliedQuality: 90,
        preview: previewUrl,
        generated: results,
      })
    } catch {
      setError('Could not read that image. Try a PNG, JPEG, or WebP file.')
    }
  }

  async function apply() {
    if (!dataUrl) return
    const q = Number(quality)
    const appliedQuality = Number.isFinite(q) && q > 0 && q <= 100 ? Math.round(q) : 90
    try {
      const img = await loadImage(dataUrl)
      const { results, previewUrl } = await renderSet(img, shape, appliedQuality)
      setPreview(previewUrl)
      setGenerated(results)
      if (fileName) {
        persist({
          version: 1,
          fileName,
          dataUrl,
          appliedShape: shape,
          appliedQuality,
          preview: previewUrl,
          generated: results,
        })
      }
      setError(null)
    } catch {
      setError('Could not apply the current settings to the image.')
    }
  }

  const downloadAll = useCallback(() => {
    if (!generated.length) return
    const combined = new Blob(generated.map((entry) => entry.blob), { type: 'application/zip' })
    saveBlob(combined, { filename: 'favicons.zip', mimeType: 'application/zip' })
  }, [generated])

  const downloadOne = useCallback((entry: GeneratedBlob) => {
    saveBlob(entry.blob, { filename: entry.name, mimeType: 'image/png' })
  }, [])

  const hasImage = fileName !== null && dataUrl !== null

  return (
    <AppShell
      name="Favicon Generator"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={hasImage ? `${generated.length} files` : 'no set'}
      status={error ? 'error' : hasImage ? 'ready' : 'idle'}
      side={
        <Rail title="Favicon Generator" note="local · canvas" chips={['8 sizes', 'square · circle', 'quality', 'offline']} />
      }>
      <Stack>
        <Card mono="Image" title="Logo">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDropActive(true)
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDropActive(false)
              const file = event.dataTransfer.files?.[0]
              if (file) void handleFile(file)
            }}
            style={{
              border: `1px solid ${dropActive ? 'var(--accent)' : 'var(--ui-line2)'}`,
              borderRadius: 'calc(2px * var(--sf))',
              padding: 'calc(16px * var(--sf))',
              background: dropActive ? 'var(--accent-soft)' : 'var(--ui-bg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(96px * var(--sf))',
              width: '100%',
            }}>
            {hasImage ? (
              <canvas ref={previewCanvasRef} style={{ maxWidth: 'calc(160px * var(--sf))', maxHeight: 'calc(160px * var(--sf))', borderRadius: 'calc(2px * var(--sf))' }} />
            ) : (
              <div>
                <Tag accent>Drop zone</Tag>
                <div style={{ color: 'var(--ink)' }}>Drop an image or click to browse</div>
              </div>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />
          {hasImage && fileName ? (
            <Actions>
              <Tag accent>{fileName}</Tag>
              <Button kind="ghost" onClick={() => inputRef.current?.click()}>
                Replace image
              </Button>
            </Actions>
          ) : null}
          {error ? <ErrorState title="Could not read the image" detail={error} /> : null}
        </Card>
        <Card mono="Settings" title="Crop and quality">
          <FormGrid>
            <Select
              label="Crop shape"
              value={shape}
              onChange={(value) => setShape(value as 'none' | 'square' | 'circle')}
              options={[
                { value: 'none', label: 'None' },
                { value: 'square', label: 'Square' },
                { value: 'circle', label: 'Circle' },
              ]}
            />
            <div style={{ display: 'block' }}>
              <label htmlFor="quality-input" style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)' }}>
                Quality
              </label>
              <input
                id="quality-input"
                type="number"
                min={0}
                max={100}
                value={quality}
                onChange={(event) => setQuality(event.target.value)}
                style={{
                  marginTop: 'calc(4px * var(--sf))',
                  padding: 'calc(8px * var(--sf))',
                  border: '1px solid var(--ui-line2)',
                  borderRadius: 'calc(2px * var(--sf))',
                  background: 'var(--ui-bg)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--sans)',
                  fontSize: 'calc(13px * var(--tf))',
                  width: '100%',
                }}
              />
            </div>
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={() => void apply()} disabled={!hasImage}>
              Apply
            </PrimaryButton>
          </Actions>
        </Card>
        <Card
          mono="Output"
          title="Favicons"
          actions={hasImage ? <Tag accent>{generated.length} files</Tag> : undefined}>
          {hasImage ? (
            <List label="Generated favicon sizes">
              {SIZES.map((size) => {
                const entry = generated.find((g) => g.name === `favicon-${size}x${size}.png`)
                return (
                  <Row
                    key={size}
                    title={`${size}x${size}`}
                    meta="PNG"
                    value={`${size}`}
                    action={
                      entry ? (
                        <Button kind="ink" onClick={() => downloadOne(entry)}>
                          Download {size}x{size}
                        </Button>
                      ) : undefined
                    }
                  />
                )
              })}
            </List>
          ) : (
            <EmptyState
              mono="Empty"
              title="No favicon set yet"
              detail="Drop an image and press Apply to generate all eight sizes."
              actionLabel="Browse for an image"
              onAction={() => inputRef.current?.click()}
            />
          )}
          {hasImage ? (
            <Actions>
              <Button kind="secondary" onClick={downloadAll} disabled={!generated.length}>
                Download all
              </Button>
            </Actions>
          ) : null}
        </Card>
      </Stack>
    </AppShell>
  )
}
