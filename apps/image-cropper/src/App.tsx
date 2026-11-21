import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { AppShell, Button, SectionLabel, Select, Stack, TextInput } from '@lacuna/ui'
import { BeforeAfter } from '@lacuna/before-after'
import { RangeSlider } from '@lacuna/range-slider'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import type { SessionState } from './host'
import { saveSession } from './host'

const DEFAULT_STATE: SessionState = {
  image: null,
  width: 0,
  height: 0,
  original: null,
  crop: { x: 0, y: 0, w: 0, h: 0 },
  filter: 'None',
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not load image'))
    img.src = src
  })
}

function canvasFromDataUrl(src: string): Promise<HTMLCanvasElement> {
  return loadImage(src).then((img) => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.drawImage(img, 0, 0)
    return canvas
  })
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('could not encode image'))
      }, type)
    } catch {
      reject(new Error('could not encode image'))
    }
  })
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function makeDemoCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.fillStyle = cssVar('--ink', 'black')
  ctx.fillRect(0, 0, 400, 300)
  ctx.fillStyle = cssVar('--accent', 'rebeccapurple')
  ctx.fillRect(0, 0, 200, 150)
  ctx.fillStyle = cssVar('--on-accent', 'white')
  ctx.fillRect(200, 150, 200, 150)
  return canvas
}

function demoDataUrl(): string {
  return makeDemoCanvas().toDataURL('image/png')
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  return ctx
}

async function dataUrlToCanvas(src: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx2d(canvas).drawImage(img, 0, 0)
  return canvas
}

async function paintFilterToCanvas(
  canvas: HTMLCanvasElement,
  src: string,
  filter: string,
): Promise<void> {
  const source = await dataUrlToCanvas(src)
  const ctx = ctx2d(canvas)
  canvas.width = source.width
  canvas.height = source.height
  ctx.clearRect(0, 0, source.width, source.height)
  if (filter === 'Grayscale') {
    ctx.filter = 'grayscale(100%)'
  } else if (filter === 'Sepia') {
    ctx.filter = 'sepia(100%)'
  }
  ctx.drawImage(source, 0, 0)
  ctx.filter = 'none'
}

async function cropSource(src: string, x: number, y: number, w: number, h: number): Promise<string> {
  const source = await dataUrlToCanvas(src)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  ctx2d(out).drawImage(source, x, y, w, h, 0, 0, w, h)
  return out.toDataURL('image/png')
}

async function resizeSource(src: string, w: number, h: number): Promise<string> {
  const source = await dataUrlToCanvas(src)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = ctx2d(out)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, w, h)
  return out.toDataURL('image/png')
}

async function rotateSource(src: string): Promise<{ url: string; width: number; height: number }> {
  const source = await dataUrlToCanvas(src)
  const out = document.createElement('canvas')
  out.width = source.height
  out.height = source.width
  const ctx = ctx2d(out)
  ctx.translate(out.width, 0)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(source, 0, 0)
  return { url: out.toDataURL('image/png'), width: out.width, height: out.height }
}

async function flipSource(src: string): Promise<string> {
  const source = await dataUrlToCanvas(src)
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const ctx = ctx2d(out)
  ctx.translate(out.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(source, 0, 0)
  return out.toDataURL('image/png')
}

const FILTERS = [
  { value: 'None', label: 'None' },
  { value: 'Grayscale', label: 'Grayscale' },
  { value: 'Sepia', label: 'Sepia' },
]

export function App() {
  const { value: session, set: setSession } = useLocalRecord<SessionState>({
    key: 'image-cropper.session',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  // Mirror the persisted session into the host store as well, so the host
  // boundary is the single write path.
  useEffect(() => {
    saveSession(session)
  }, [session])

  // Repaint the stage canvas whenever the working image or filter changes.
  const image = session.image
  const filter = session.filter
  useEffect(() => {
    if (!image) return
    let cancelled = false
    void (async () => {
      try {
        const canvas = canvasRef.current
        if (!canvas) return
        await paintFilterToCanvas(canvas, image, filter)
      } catch {
        // repaint skipped; the image is still persisted
      }
    })()
    return () => {
      cancelled = true
    }
  }, [image, filter])

  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const cropRef = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const [crop, setCrop] = useState(session.crop)
  const [dragging, setDragging] = useState(false)
  const [widthText, setWidthText] = useState('')
  const [heightText, setHeightText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const clipboard = useClipboard()

  useEffect(() => {
    if (status === null) return
    const t = window.setTimeout(() => setStatus(null), 4000)
    return () => window.clearTimeout(t)
  }, [status])

  const loaded = session.image !== null && session.width > 0 && session.height > 0

  // Re-seed the crop box when a new image replaces the current one.
  useEffect(() => {
    if (loaded) {
      const full = { x: 0, y: 0, w: session.width, h: session.height }
      cropRef.current = full
      setCrop(full)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.image])

  function pickFile() {
    fileRef.current?.click()
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onerror = () => setStatus('Could not read that file')
    reader.onload = () => {
      const src = String(reader.result)
      void (async () => {
        try {
          const img = await loadImage(src)
          setSession({
            image: src,
            width: img.naturalWidth,
            height: img.naturalHeight,
            original: src,
            crop: { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight },
            filter: 'None',
          })
          setStatus(null)
        } catch {
          setStatus('Could not open that image')
        }
      })()
    }
    reader.readAsDataURL(file)
  }

  function demoImage() {
    const src = demoDataUrl()
    setSession({
      image: src,
      width: 400,
      height: 300,
      original: src,
      crop: { x: 0, y: 0, w: 400, h: 300 },
      filter: 'None',
    })
    setStatus(null)
  }

  async function applyCrop() {
    const c = cropRef.current
    if (!session.image || c.w < 2 || c.h < 2) {
      setStatus('Pick a crop region first')
      return
    }
    try {
      const dataUrl = await cropSource(session.image, c.x, c.y, c.w, c.h)
      const full = { x: 0, y: 0, w: c.w, h: c.h }
      cropRef.current = full
      setSession((prev) => ({
        ...prev,
        image: dataUrl,
        width: c.w,
        height: c.h,
        crop: full,
      }))
      setStatus(null)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Crop failed')
    }
  }

  async function resizeImage() {
    const w = Number.parseInt(widthText, 10)
    const h = Number.parseInt(heightText, 10)
    if (!session.image || !Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      setStatus('Enter a width and height')
      return
    }
    try {
      const dataUrl = await resizeSource(session.image, w, h)
      const full = { x: 0, y: 0, w: w, h: h }
      cropRef.current = full
      setSession((prev) => ({ ...prev, image: dataUrl, width: w, height: h, crop: full }))
      setStatus(null)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Resize failed')
    }
  }

  async function rotate90() {
    if (!session.image) return
    try {
      const out = await rotateSource(session.image)
      const full = { x: 0, y: 0, w: out.width, h: out.height }
      cropRef.current = full
      setSession((prev) => ({ ...prev, image: out.url, width: out.width, height: out.height, crop: full }))
      setStatus(null)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Rotate failed')
    }
  }

  async function flipHorizontal() {
    if (!session.image) return
    try {
      const dataUrl = await flipSource(session.image)
      setSession((prev) => ({ ...prev, image: dataUrl }))
      setStatus(null)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Flip failed')
    }
  }

  async function exportPng() {
    if (!session.image) return
    try {
      const canvas = await canvasFromDataUrl(session.image)
      const blob = await blobFromCanvas(canvas, 'image/png')
      saveBlob(blob, { filename: 'cropped.png', mimeType: 'image/png' })
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed')
    }
  }

  async function copyPng() {
    if (!session.image) return
    try {
      const canvas = await canvasFromDataUrl(session.image)
      const blob = await blobFromCanvas(canvas, 'image/png')
      await clipboard.copy(blob)
      setStatus('Copied to clipboard')
    } catch {
      setStatus('Clipboard unavailable')
    }
  }

  function onFilterChange(next: string) {
    setSession((prev) => ({ ...prev, filter: next }))
  }

  function clampCrop(x: number, y: number) {
    const c = cropRef.current
    const ox = Math.min(Math.max(0, c.x), Math.max(0, session.width - 8))
    const oy = Math.min(Math.max(0, c.y), Math.max(0, session.height - 8))
    const maxRight = Math.max(ox + 8, Math.min(session.width, ox + session.width))
    const maxBottom = Math.max(oy + 8, Math.min(session.height, oy + session.height))
    const right = Math.min(Math.max(ox + 8, x), maxRight)
    const bottom = Math.min(Math.max(oy + 8, y), maxBottom)
    return { x: ox, y: oy, w: right - ox, h: bottom - oy }
  }

  function onHandleDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onHandleMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || !stageRef.current || !session.image) return
    const rect = stageRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const scale = session.width / rect.width
    const x = (event.clientX - rect.left) * scale
    const y = (event.clientY - rect.top) * scale
    const next = clampCrop(x, y)
    cropRef.current = next
    setCrop(next)
  }

  function onHandleUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <AppShell
      name="Image Cropper"
      icon="paint"
      hue="rust"
      category="Productivity"
      meta={loaded ? `${session.width} × ${session.height}` : 'empty'}
      status={status ?? 'Local · no network'}
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
        {!loaded ? (
          <EmptyStage onLoad={pickFile} onDemo={demoImage} />
        ) : (
          <>
            <div
              ref={stageRef}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 'calc(640px * var(--sf))',
                margin: '0 auto',
              }}
            >
              <canvas ref={(el) => { canvasRef.current = el }} width={session.width} height={session.height} style={{ display: 'block', width: '100%', height: 'auto' }} />
              <div
                style={{
                  position: 'absolute',
                  left: `${(crop.x / session.width) * 100}%`,
                  top: `${(crop.y / session.height) * 100}%`,
                  width: `${(crop.w / session.width) * 100}%`,
                  height: `${(crop.h / session.height) * 100}%`,
                  border: 'calc(2px * var(--sf)) solid var(--accent)',
                  boxShadow: '0 0 0 calc(1000px * var(--sf)) color-mix(in oklab, var(--ink) 35%, transparent)',
                  pointerEvents: 'none',
                }}
              />
              <div
                role="slider"
                aria-label="Crop size handle"
                aria-valuenow={Math.round((crop.w / Math.max(1, session.width)) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                tabIndex={0}
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                style={{
                  position: 'absolute',
                  left: `${((crop.x + crop.w) / session.width) * 100}%`,
                  top: `${((crop.y + crop.h) / session.height) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 'calc(22px * var(--sf))',
                  height: 'calc(22px * var(--sf))',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  border: 'calc(2px * var(--sf)) solid var(--on-accent)',
                  cursor: 'nwse-resize',
                  pointerEvents: 'auto',
                  touchAction: 'none',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'calc(10px * var(--sf))',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(14px * var(--tf))',
                  color: 'var(--ink)',
                }}
              >
                {session.width} x {session.height} px
              </span>
              <Button kind="primary" onClick={applyCrop}>
                Apply crop
              </Button>
            </div>

            <Stack>
              <SectionLabel>Resize</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))', alignItems: 'flex-end' }}>
                <TextInput
                  label="Width"
                  type="number"
                  inputMode="numeric"
                  value={widthText}
                  onChange={setWidthText}
                  placeholder={String(session.width)}
                />
                <TextInput
                  label="Height"
                  type="number"
                  inputMode="numeric"
                  value={heightText}
                  onChange={setHeightText}
                  placeholder={String(session.height)}
                />
                <Button kind="secondary" onClick={resizeImage}>
                  Resize
                </Button>
              </div>
            </Stack>

            <Stack>
              <SectionLabel>Transform</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))' }}>
                <Button kind="secondary" onClick={rotate90}>
                  Rotate 90
                </Button>
                <Button kind="secondary" onClick={flipHorizontal}>
                  Flip horizontal
                </Button>
              </div>
            </Stack>

            <Stack>
              <SectionLabel>Adjust</SectionLabel>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'calc(16px * var(--sf))',
                  alignItems: 'flex-end',
                  width: '100%',
                  maxWidth: 'calc(480px * var(--sf))',
                }}
              >
                <div style={{ flex: '1 1 calc(200px * var(--sf))' }}>
                  <Select
                    label="Filter"
                    value={session.filter}
                    onChange={onFilterChange}
                    options={FILTERS}
                  />
                </div>
                <div style={{ flex: '1 1 calc(200px * var(--sf))' }}>
                  <RangeSlider
                    label="Crop size"
                    value={Math.round(crop.w)}
                    min={8}
                    max={session.width}
                    step={1}
                    onChange={(v) => {
                      const c = cropRef.current
                      const w = Math.min(Math.max(8, v), session.width - c.x)
                      const h = Math.round((w / c.w) * c.h)
                      const next = { ...c, w, h: Math.min(h, session.height - c.y) }
                      cropRef.current = next
                      setCrop(next)
                    }}
                  />
                </div>
              </div>
            </Stack>

            <Stack>
              <SectionLabel>Export</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))' }}>
                <Button kind="ink" onClick={exportPng}>
                  Export PNG
                </Button>
                <Button kind="secondary" onClick={copyPng}>
                  Copy image
                </Button>
                <span style={{ alignSelf: 'center', fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>
                  {clipboard.copied ? 'Copied' : ''}
                </span>
              </div>
            </Stack>
          </>
        )}

        {loaded && session.original !== null && session.image !== null && session.original !== session.image ? (
          <Stack>
            <SectionLabel>Before / after</SectionLabel>
            <BeforeAfter
              mode="side-by-side"
              ariaLabel="Original and edited image"
              before={<img src={session.original} alt="Original image" style={{ display: 'block', width: '100%', height: 'auto' }} />}
              after={<img src={session.image} alt="Edited image" style={{ display: 'block', width: '100%', height: 'auto' }} />}
            />
          </Stack>
        ) : null}

        {status ? (
          <p role="alert" style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>
            {status}
          </p>
        ) : null}
      </Stack>
    </AppShell>
  )
}

function EmptyStage({ onLoad, onDemo }: { onLoad: () => void; onDemo: () => void }) {
  return (
    <Stack>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--sans)',
          fontSize: 'calc(16px * var(--tf))',
          color: 'var(--ink-60)',
          textAlign: 'center',
          padding: 'calc(24px * var(--sf))',
        }}
      >
        No image loaded
      </p>
      <div style={{ display: 'flex', gap: 'calc(10px * var(--sf))', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button kind="primary" onClick={onLoad}>
          Load image
        </Button>
        <Button kind="secondary" onClick={onDemo}>
          Use demo image
        </Button>
      </div>
    </Stack>
  )
}
