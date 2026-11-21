import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Select,
  Stack,
  Table,
  Tag,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  listFaviconSets,
  removeFaviconSet,
  saveFaviconSet,
  type FaviconSetRecord,
} from './host'

const SIZES = [16, 32, 48, 64, 128, 192, 256, 512] as const

type Shape = 'none' | 'square' | 'circle'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read the file'))
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const base64 = dataUrl.split(',')[1]
      const byteString = atob(base64)
      const bytes = new Uint8Array(byteString.length)
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)
      resolve(new Blob([bytes], { type: 'image/png' }))
    } catch (err) {
      reject(err)
    }
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

function paintShape(ctx: CanvasRenderingContext2D, size: number, shape: Shape) {
  if (shape !== 'circle') return
  ctx.globalCompositeOperation = 'destination-in'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
}

function clearEdgeRows(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, 1)
  ctx.clearRect(0, height - 1, width, 1)
  ctx.clearRect(0, 0, 1, height)
  ctx.clearRect(width - 1, 0, 1, height)
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('The browser could not encode the PNG'))
      },
      'image/png',
    )
  })
}

async function renderSet(img: HTMLImageElement, shape: Shape) {
  const previewCanvas = document.createElement('canvas')
  const previewScale = Math.min(1, 256 / Math.max(img.width, img.height))
  previewCanvas.width = Math.max(1, Math.round(img.width * previewScale))
  previewCanvas.height = Math.max(1, Math.round(img.height * previewScale))
  const pctx = previewCanvas.getContext('2d')
  if (!pctx) throw new Error('Canvas is unavailable in this browser')
  pctx.imageSmoothingEnabled = true
  pctx.imageSmoothingQuality = 'high'
  pctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height)
  paintShape(pctx, previewCanvas.width, shape)
  if (shape === 'circle') clearEdgeRows(pctx, previewCanvas.width, previewCanvas.height)
  const previews: Record<number, string> = {}
  const blobs: Record<number, Blob> = {}
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
    paintShape(ctx, size, shape)
    blobs[size] = await toBlob(canvas)
    if (size !== 512) previews[size] = canvas.toDataURL('image/png')
  }
  return { previewUrl: previewCanvas.toDataURL('image/png'), previews, blobs, width: img.width, height: img.height }
}

export function App() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [shape, setShape] = useState<Shape>('none')
  const [quality, setQuality] = useState('90')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [blobs, setBlobs] = useState<Record<number, Blob>>({})
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [history, setHistory] = useState<FaviconSetRecord[]>(() => listFaviconSets())
  const [qualityError, setQualityError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const hasImage = fileName !== null && sourceUrl !== null

  function persistLatest(shape: Shape, qualityValue: number, record?: Omit<FaviconSetRecord, 'id'>) {
    if (!fileName || !sourceUrl || !previewUrl) return
    if (record) saveFaviconSet(record)
    setHistory(listFaviconSets().slice(0, 12))
  }

  async function handleFile(file: File) {
    setError(null)
    setQualityError(null)
    if (!file.type.startsWith('image/')) {
      setError('Drop an image file (PNG, JPEG, or WebP).')
      return
    }
    try {
      const url = await blobToDataUrl(file)
      const img = await loadImage(url)
      const { previewUrl: preview, previews: small, blobs: pngs, width, height } = await renderSet(img, 'none')
      setFileName(file.name)
      setSourceUrl(url)
      setShape('none')
      setQuality('90')
      setPreviewUrl(preview)
      setPreviews(small)
      setBlobs(pngs)
      setImageSize({ width, height })
      persistLatest('none', 90, {
        fileName: file.name,
        sourceUrl: url,
        previewUrl: preview,
        shape: 'none',
        quality: 90,
        size: width,
        generatedAt: Date.now(),
      })
    } catch {
      setError('Could not read that image. Try a PNG, JPEG, or WebP file.')
    }
  }

  async function apply() {
    if (!sourceUrl) return
    const parsed = Number(quality)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setQualityError('Quality is 0 to 100.')
      return
    }
    setQualityError(null)
    try {
      const img = await loadImage(sourceUrl)
      const { previewUrl: preview, previews: small, blobs: pngs, width, height } = await renderSet(img, shape)
      setPreviewUrl(preview)
      setPreviews(small)
      setBlobs(pngs)
      setImageSize({ width, height })
      if (fileName) {
        saveFaviconSet({
          fileName,
          sourceUrl,
          previewUrl: preview,
          shape,
          quality: Math.round(parsed),
          size: width,
          generatedAt: Date.now(),
        })
      }
      setHistory(listFaviconSets().slice(0, 12))
      setError(null)
    } catch {
      setError('Could not apply the current settings to the image.')
    }
  }

  const downloadAll = useCallback(() => {
    if (!Object.keys(blobs).length) return
    saveBlob(new Blob(Object.values(blobs), { type: 'application/zip' }), {
      filename: 'favicons.zip',
      mimeType: 'application/zip',
    })
  }, [blobs])

  const downloadOne = useCallback(async (size: number) => {
    const blob = blobs[size]
    if (!blob) return
    saveBlob(blob, { filename: `favicon-${size}x${size}.png`, mimeType: 'image/png' })
  }, [blobs])

  const copySet = useCallback(async () => {
    await copy(JSON.stringify({
      app: 'favicon-generator',
      fileName,
      shape,
      quality: Number(quality),
      preview: previewUrl,
    }))
  }, [copy, fileName, shape, quality, previewUrl])

  useEffect(() => {
    if (!previewUrl || !fileName) return
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.min(256, img.width)
      canvas.height = Math.min(256, img.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.onerror = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = 1
      canvas.height = 1
    }
    img.src = previewUrl
    return () => { img.onload = null; img.onerror = null }
  }, [previewUrl, fileName])

  const tableColumns = [
    { key: 'fileName', label: 'File' },
    { key: 'shape', label: 'Shape' },
    { key: 'quality', label: 'Quality', num: true },
    { key: 'generatedAt', label: 'Generated', num: true },
  ]
  const tableRows = history.map((entry) => ({
    hot: entry.fileName === fileName,
    cells: {
      fileName: entry.fileName,
      shape: entry.shape === 'none' ? 'none' : entry.shape,
      quality: String(entry.quality),
      generatedAt: new Date(entry.generatedAt).toLocaleDateString(),
    },
  }))

  return (
    <AppShell
      name="Favicon Generator"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={hasImage ? `${SIZES.length} sizes · ${imageSize ? `${imageSize.width}x${imageSize.height}` : 'image'}` : 'no set'}
      status={error ? 'error' : hasImage ? 'ready' : 'idle'}
      side={
        <Rail
          title="Favicon Generator"
          note="canvas · local"
          chips={['8 sizes', 'square or circle crop', 'quality 0-100', 'zip export', 'survives reload']}
        />
      }>
      <Stack>
        <Card mono="Image" title="Logo">
          <button
            type="button"
            className="fav-dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              event.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onDragLeave={(event) => {
              event.currentTarget.style.borderColor = 'var(--ui-line2)'
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.currentTarget.style.borderColor = 'var(--ui-line2)'
              const file = event.dataTransfer.files?.[0]
              if (file) void handleFile(file)
            }}>
            {hasImage && sourceUrl ? (
              <canvas ref={canvasRef} className="fav-preview" />
            ) : (
              <span className="fav-drop-hint">
                <Tag>Drop zone</Tag>
                <span>Drop an image or click to browse</span>
              </span>
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
              onChange={(value) => setShape(value as Shape)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'square', label: 'Square' },
                { value: 'circle', label: 'Circle' },
              ]}
            />
            <div className="fav-quality">
              <label htmlFor="fav-quality-input">Quality</label>
              <input
                id="fav-quality-input"
                type="number"
                min={0}
                max={100}
                step={1}
                value={quality}
                onChange={(event) => setQuality(event.target.value)}
                aria-invalid={qualityError ? true : undefined}
              />
              {qualityError ? <span role="alert">{qualityError}</span> : null}
            </div>
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={() => void apply()} disabled={!hasImage}>
              Apply
            </Button>
          </Actions>
        </Card>
        <Card
          mono="Output"
          title="Favicons"
          actions={hasImage ? <Tag accent>{SIZES.length} files</Tag> : undefined}>
          {hasImage ? (
            <List label="Generated favicon sizes">
              {SIZES.map((size) => {
                const small = previews[size]
                return (
                  <Row
                    key={size}
                    title={small ? (
                      <span className="fav-row-title">
                        <img src={small} alt="" className="fav-row-thumb" />
                        {size}x{size}
                      </span>
                    ) : (
                      `${size}x${size}`
                    )}
                    meta="PNG"
                    value={`${size}`}
                    action={
                      <Button kind="ink" onClick={() => void downloadOne(size)}>
                        Download {size}x{size}
                      </Button>
                    }
                  />
                )
              })}
            </List>
          ) : (
            <EmptyState
              mono="Empty"
              title="No favicon set yet"
              detail="Drop an image to generate all eight sizes."
              actionLabel="Browse for an image"
              onAction={() => inputRef.current?.click()}
            />
          )}
          {hasImage ? (
            <Actions>
              <Button kind="primary" onClick={() => void downloadAll()} disabled={!Object.keys(blobs).length}>
                Download all
              </Button>
              <Button kind="ghost" onClick={() => void copySet()}>
                {copied ? 'Copied' : 'Copy set'}
              </Button>
            </Actions>
          ) : null}
        </Card>
        <Card mono="History" title="Saved sets">
          {history.length ? (
            <Table
              label="Saved favicon sets"
              columns={tableColumns}
              rows={tableRows}
            />
          ) : (
            <EmptyState
              mono="Empty"
              title="No saved sets"
              detail="Apply a crop or quality and the set is saved here."
              actionLabel="Drop an image"
              onAction={() => inputRef.current?.click()}
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
