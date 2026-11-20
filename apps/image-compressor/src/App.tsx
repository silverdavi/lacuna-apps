import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { Button, Card, MonoLabel, Stack, TextInput } from '@lacuna/ui'
import { loadOptions, saveOptions } from './host'
import type { CompressOptions, ImageFormat } from './host'

interface LoadedImage {
  src: string
  width: number
  height: number
  bytes: number
}

interface Result {
  src: string
  width: number
  height: number
  bytes: number
}

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return 0
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4)
}

function formatBytes(bytes: number): string {
  if (bytes < 512) return '0 B'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function decodeImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const img = new Image()
      img.src = src
      img.decode()
        .then(() => {
          resolve({ src, width: img.naturalWidth, height: img.naturalHeight, bytes: file.size })
        })
        .catch(reject)
    }
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function render(
  source: LoadedImage,
  format: ImageFormat,
  quality: number,
  targetWidth: number | null,
  rotation: number,
  flipped: boolean,
): Promise<Result> {
  const img = new Image()
  img.src = source.src
  const quarter = ((rotation % 360) + 360) % 360
  const swap = quarter === 90 || quarter === 270
  const baseW = swap ? source.height : source.width
  const baseH = swap ? source.width : source.height
  const scale = targetWidth && targetWidth > 0 ? targetWidth / baseW : 1
  const outW = Math.max(1, Math.round(baseW * scale))
  const outH = Math.max(1, Math.round(baseH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve({ src: source.src, width: outW, height: outH, bytes: dataUrlBytes(source.src) })
  ctx.save()
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((quarter * Math.PI) / 180)
  if (flipped) ctx.scale(-1, 1)
  ctx.drawImage(img, (-baseW * scale) / 2, (-baseH * scale) / 2, baseW * scale, baseH * scale)
  ctx.restore()
  const dataUrl = canvas.toDataURL(format, format === 'image/jpeg' ? quality / 100 : undefined)
  return Promise.resolve({ src: dataUrl, width: outW, height: outH, bytes: dataUrlBytes(dataUrl) })
}

export function App() {
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [quality, setQuality] = useState(() => loadOptions().quality)
  const [format, setFormat] = useState<ImageFormat>(() => loadOptions().format)
  const [width, setWidth] = useState(() => loadOptions().width)
  const [rotation, setRotation] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveOptions({ format, quality, width } satisfies CompressOptions)
  }, [format, quality, width])

  const takeFile = useCallback((file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Drop an image file.')
      return
    }
    decodeImage(file)
      .then((loaded) => {
        setImage(loaded)
        setResult(null)
        setRotation(0)
        setFlipped(false)
        setError('')
      })
      .catch(() => {
        setError('Could not read that image.')
      })
  }, [])

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    takeFile(event.target.files?.[0])
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    takeFile(event.dataTransfer.files?.[0])
  }

  const compress = () => {
    if (!image) return
    const target = width.trim() === '' ? null : Number.parseInt(width, 10)
    void render(image, format, Number(quality) || 85, target, rotation, flipped).then(setResult)
  }

  const reset = () => {
    setQuality('85')
    setFormat('image/png')
    setWidth('')
    setRotation(0)
    setFlipped(false)
    setResult(null)
  }

  const openPicker = () => fileRef.current?.click()

  const onDropKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop,
  }

  const ext = format === 'image/jpeg' ? 'jpg' : 'png'
  const dataUrl = result?.src ?? image?.src ?? ''
  const compressedFigure = result ? formatBytes(result.bytes) : ''

  return (
    <main style={{ display: 'grid', gap: 'calc(16px * var(--sf))' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 'calc(26px * var(--tf))', color: 'var(--ink)', margin: 0 }}>
        Image Compressor
      </h1>
      <Card mono="Compress" title="Options">
        <Stack>
          <TextInput label="Quality" value={quality} onChange={setQuality} />
          <label style={{ display: 'grid', gap: 'calc(4px * var(--sf))' }}>
            <span>Format</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as ImageFormat)}>
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
            </select>
          </label>
          <TextInput label="Width" value={width} onChange={setWidth} />
          <Button kind="primary" onClick={compress}>
            Compress
          </Button>
          <Stack>
            <Button onClick={() => setRotation((value) => (value + 90) % 360)}>Rotate 90</Button>
            <Button onClick={() => setFlipped((value) => !value)}>Flip Horizontal</Button>
            <Button onClick={reset}>Reset</Button>
          </Stack>
        </Stack>
      </Card>
      <Card mono="Preview" title="Result">
        <Stack>
          {!image && (
            <>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 'calc(13.5px * var(--tf))', color: 'var(--ink)', lineHeight: 1.55 }}>
                No image loaded
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={openPicker}
                onKeyDown={onDropKey}
                {...dropHandlers}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  gap: 'calc(8px * var(--sf))',
                  padding: 'calc(32px * var(--sf))',
                  border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--mid)'}`,
                }}
              >
                <span style={{ color: 'var(--ink)' }}>Drop an image or click to browse</span>
                <span style={{ color: 'var(--mid)' }}>PNG or JPEG</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onInput}
                aria-label="Image file"
                style={{ display: 'none' }}
              />
            </>
          )}
          {image && (
            <>
              <div {...dropHandlers} style={{ display: 'grid', gap: 'calc(8px * var(--sf))' }}>
                <img src={dataUrl} alt="Image preview" />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onInput}
                  aria-label="Image file"
                  style={{ width: '100%' }}
                />
              </div>
              <Stack>
                <MonoLabel>Original: {image.width}x{image.height}</MonoLabel>
                {result && <MonoLabel>Compressed: {compressedFigure}</MonoLabel>}
                <MonoLabel>Rotation: {rotation}°</MonoLabel>
                {flipped && <MonoLabel>Flipped: Horizontal</MonoLabel>}
                {error && <MonoLabel accent>{error}</MonoLabel>}
                {result && (
                  <a
                    href={dataUrl}
                    download={`compressed.${ext}`}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    Download compressed<span style={{ color: 'var(--mid)' }}>.{ext}</span>
                  </a>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Card>
    </main>
  )
}
