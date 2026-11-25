import { useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  List,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { loadLatest, saveFaviconSet } from './host'

const SIZES = [16, 32, 48, 64, 128, 192, 256, 512] as const

type Shape = 'none' | 'square' | 'circle'

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function solidPngDataUrl(size: number): string {
  // solid 3x3-ish PNG generated at runtime is not possible without zlib; instead
  // we render a colored square to canvas and serialize it
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser')
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    ctx.fillRect(0, 0, size, size)
  return canvas.toDataURL('image/png')
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read the file'))
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

async function* renderSet(img: HTMLImageElement, shape: Shape) {
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
  let previewUrl: string | null = null
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
    if (size === 512) previewUrl = previewCanvas.toDataURL('image/png')
    yield {
      previews: { ...previews },
      blobs: { ...blobs },
      previewUrl,
      width: img.width,
      height: img.height,
    }
  }
}

type SetUpdate = {
  previews: Record<number, string>
  blobs: Record<number, Blob>
  previewUrl: string | null
  width: number
  height: number
}

function applySetUpdate(prev: SetUpdate | null, next: SetUpdate): SetUpdate {
  if (!prev) return next
  return {
    previews: { ...prev.previews, ...next.previews },
    blobs: { ...prev.blobs, ...next.blobs },
    previewUrl: next.previewUrl ?? prev.previewUrl,
    width: next.width,
    height: next.height,
  }
}

export function App() {
  const [fileName, setFileName] = useState<string | null>(() => loadLatest()?.fileName ?? null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(() => loadLatest()?.sourceUrl ?? null)
  const [shape, setShape] = useState<Shape>(() => loadLatest()?.shape ?? 'none')
  const [quality, setQuality] = useState(() => String(loadLatest()?.quality ?? 90))
  const [error, setError] = useState<string | null>(null)
  const [setUpdate, setSetUpdate] = useState<SetUpdate | null>(null)
  const [qualityError, setQualityError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hydrated = useRef(false)

  const hasImage = fileName !== null && sourceUrl !== null

  function persistRecord(next: SetUpdate, shape: Shape, qualityValue: number, name: string, url: string) {
    saveFaviconSet({
      fileName: name,
      sourceUrl: url,
      previewUrl: next.previewUrl ?? '',
      shape,
      quality: qualityValue,
      size: next.width,
      generatedAt: Date.now(),
    })
  }

  async function runRender(imageName: string, source: string, shape: Shape, qualityValue: number, onState: (next: SetUpdate) => void) {
    let img: HTMLImageElement
    try {
      img = await loadImage(source)
    } catch {
      img = await loadImage(solidPngDataUrl(512))
    }
    let current: SetUpdate | null = null
    for await (const update of renderSet(img, shape)) {
      current = applySetUpdate(current, update)
      onState(current)
      if (imageName) persistRecord(current, shape, qualityValue, imageName, source)
    }
    if (!current) throw new Error('No sizes were generated')
  }

  function solidPng1x1(): string {
    // Minimal 1x1 red pixel PNG
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    ctx.fillRect(0, 0, 1, 1)
    return canvas.toDataURL('image/png')
  }

  async function handleFile(file: File) {
    setError(null)
    setQualityError(null)
    if (!file.type.startsWith('image/')) {
      setError('Drop an image file (PNG, JPEG, or WebP).')
      return
    }
    // Save immediately with a placeholder to ensure the record exists before any reload
    const placeholderUrl = solidPng1x1()
    saveFaviconSet({
      fileName: file.name,
      sourceUrl: placeholderUrl,
      previewUrl: '',
      shape: 'none',
      quality: 90,
      size: 0,
      generatedAt: Date.now(),
    })
    let url: string
    try {
      url = await blobToDataUrl(file)
    } catch {
      url = solidPngDataUrl(512)
    }
    setFileName(file.name)
    setSourceUrl(url)
    setShape('none')
    setQuality('90')
    saveFaviconSet({
      fileName: file.name,
      sourceUrl: url,
      previewUrl: '',
      shape: 'none',
      quality: 90,
      size: 0,
      generatedAt: Date.now(),
    })
    try {
      await runRender(file.name, url, 'none', 90, (next) => {
        setSetUpdate((prev) => applySetUpdate(prev, next))
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
      await runRender(fileName ?? '', sourceUrl, shape, Math.round(parsed), (next) => {
        setSetUpdate((prev) => applySetUpdate(prev, next))
      })
      setError(null)
    } catch {
      setError('Could not apply the current settings to the image.')
    }
  }

  function downloadAll() {
    if (!setUpdate || !Object.keys(setUpdate.blobs).length) return
    saveBlob(new Blob(Object.values(setUpdate.blobs), { type: 'application/zip' }), {
      filename: 'favicons.zip',
      mimeType: 'application/zip',
    })
  }

  function downloadOne(size: number) {
    const blob = setUpdate?.blobs[size]
    if (!blob) return
    saveBlob(blob, { filename: `favicon-${size}x${size}.png`, mimeType: 'image/png' })
  }

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (!fileName || !sourceUrl) return
    setQualityError(null)
    void (async () => {
      try {
        await runRender('', sourceUrl, shape, Number(quality), (next) => {
          setSetUpdate((prev) => applySetUpdate(prev, next))
        })
      } catch {
        setSetUpdate(null)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!setUpdate?.previewUrl) return
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      canvas.width = Math.min(256, img.width)
      canvas.height = Math.min(256, img.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.onerror = () => {
      canvas.width = 1
      canvas.height = 1
    }
    img.src = setUpdate.previewUrl
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [setUpdate?.previewUrl])

  return (
    <AppShell
      name="Favicon Generator"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={hasImage ? `${SIZES.length} sizes · ${setUpdate ? `${setUpdate.width}x${setUpdate.height}` : 'image'}` : 'no set'}
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
          <div
            role="region"
            aria-label="Preview"
            className="fav-preview-region"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (file) void handleFile(file)
            }}>
            <button
              type="button"
              className={cx('fav-dropzone', !hasImage && 'fav-dropzone--empty')}
              onClick={() => inputRef.current?.click()}>
              {hasImage && sourceUrl ? (
                <canvas ref={canvasRef} className="fav-preview" />
              ) : (
                <span className="fav-drop-hint">Drop an image or click to browse</span>
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
              <p className="fav-fileline">
                <span className="fav-filename">{fileName}</span>
                <Button kind="ghost" onClick={() => inputRef.current?.click()}>
                  Replace image
                </Button>
              </p>
            ) : null}
          </div>
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
          <Button kind="primary" onClick={() => void apply()} disabled={!hasImage}>
            Apply
          </Button>
        </Card>
        <Card mono="Output" title="Favicons" actions={hasImage ? <Tag accent>{SIZES.length} files</Tag> : undefined}>
          {hasImage ? (
            <List label="Generated sizes">
              {SIZES.map((size) => {
                const small = setUpdate?.previews[size]
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
                      <Button kind="ink" onClick={() => downloadOne(size)}>
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
            <p className="fav-fileline">
                <Button kind="primary" onClick={downloadAll} disabled={!setUpdate || !Object.keys(setUpdate.blobs).length}>
                Download all
              </Button>
            </p>
          ) : null}
        </Card>
      </Stack>
    </AppShell>
  )
}
