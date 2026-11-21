import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Rail, Select, Stack } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import type { SessionState } from './host'
import { saveSession } from './host'

const FILTERS = ['None', 'Grayscale', 'Sepia', 'Invert']
const TRANSFORMS = ['None', 'Rotate 90°', 'Rotate 180°', 'Flip Horizontal', 'Flip Vertical']

const DEFAULT_STATE: SessionState = {
  original: null,
  image: null,
  fileName: '',
  width: 0,
  height: 0,
  filter: 'None',
  transform: 'None',
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  return ctx
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not load image'))
    img.src = src
  })
}

function dataUrlToCanvas(src: string): Promise<HTMLCanvasElement> {
  return loadImage(src).then((img) => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx2d(canvas).drawImage(img, 0, 0)
    return canvas
  })
}

const CANVAS_FILTERS: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  Grayscale: (ctx) => {
    ctx.filter = 'grayscale(100%)'
  },
  Sepia: (ctx) => {
    ctx.filter = 'sepia(100%)'
  },
  Invert: (ctx) => {
    ctx.filter = 'invert(100%)'
  },
}

async function applyEdit(
  src: string,
  filter: string,
  transform: string,
): Promise<{ url: string; width: number; height: number }> {
  const source = await dataUrlToCanvas(src)
  let w = source.width
  let h = source.height

  const out = document.createElement('canvas')
  const ctx = ctx2d(out)

  switch (transform) {
    case 'Rotate 90°':
      out.width = h
      out.height = w
      ctx.translate(out.width, 0)
      ctx.rotate(Math.PI / 2)
      w = out.width
      h = out.height
      break
    case 'Rotate 180°':
      out.width = w
      out.height = h
      ctx.translate(w, h)
      ctx.rotate(Math.PI)
      break
    case 'Flip Horizontal':
      out.width = w
      out.height = h
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      break
    case 'Flip Vertical':
      out.width = w
      out.height = h
      ctx.translate(0, h)
      ctx.scale(1, -1)
      break
    default:
      out.width = w
      out.height = h
      break
  }

  const applyFilter = CANVAS_FILTERS[filter]
  if (applyFilter) applyFilter(ctx)
  ctx.drawImage(source, 0, 0)
  ctx.filter = 'none'

  return { url: out.toDataURL('image/png'), width: out.width, height: out.height }
}

async function paintPreview(canvas: HTMLCanvasElement, src: string) {
  const source = await dataUrlToCanvas(src)
  canvas.width = source.width
  canvas.height = source.height
  ctx2d(canvas).drawImage(source, 0, 0)
}

export function App() {
  const { value: session, set: setSession } = useLocalRecord<SessionState>({
    key: 'photo-editor.session',
    version: 1,
    defaultValue: DEFAULT_STATE,
  })

  useEffect(() => {
    saveSession(session)
  }, [session])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [appliedFilter, setAppliedFilter] = useState(session.filter)
  const [appliedTransform, setAppliedTransform] = useState(session.transform)

  const pendingFilter = session.filter
  const pendingTransform = session.transform

  function onFilterChange(value: string) {
    setSession((prev) => ({ ...prev, filter: value }))
  }

  function onTransformChange(value: string) {
    setSession((prev) => ({ ...prev, transform: value }))
  }

  const loaded = session.image !== null

  // Repaint the stage canvas whenever the applied image changes.
  useEffect(() => {
    const image = session.image
    if (!image) return
    void (async () => {
      try {
        const canvas = canvasRef.current
        if (!canvas) return
        await paintPreview(canvas, image)
      } catch {
        // repaint skipped; the image is still persisted
      }
    })()
  }, [session.image])

  function onFileSelected(file: File) {
    // Mark a load in-flight immediately so the preview canvas mounts on the
    // next commit, well before the async decode finishes. This keeps the
    // preview element present as soon as the file is chosen.
    setPending(true)
    const reader = new FileReader()
    reader.onerror = () => {
      setPending(false)
      setError('Could not read that file')
    }
    reader.onload = () => {
      const src = String(reader.result)
      void (async () => {
        try {
          const img = await loadImage(src)
          setSession({
            original: src,
            image: src,
            fileName: file.name,
            width: img.naturalWidth,
            height: img.naturalHeight,
            filter: 'None',
            transform: 'None',
          })
          setAppliedFilter('None')
          setAppliedTransform('None')
          setPending(false)
          setError(null)
        } catch {
          setPending(false)
          setError('Could not open that image')
        }
      })()
    }
    reader.readAsDataURL(file)
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onFileSelected(file)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) onFileSelected(file)
  }

  async function apply() {
    if (!session.image) return
    const image = session.image
    const filter = session.filter
    const transform = session.transform
    try {
      const result = await applyEdit(image, filter, transform)
      setSession((prev) => ({
        ...prev,
        image: result.url,
        width: result.width,
        height: result.height,
      }))
      setAppliedFilter(filter)
      setAppliedTransform(transform)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed')
    }
  }

  function reset() {
    setSession((prev) => ({
      ...prev,
      image: prev.original,
      width: prev.width,
      height: prev.height,
      filter: 'None',
      transform: 'None',
    }))
    setAppliedFilter('None')
    setAppliedTransform('None')
    setPending(false)
    setError(null)
  }

  function clear() {
    setSession(DEFAULT_STATE)
    setAppliedFilter('None')
    setAppliedTransform('None')
    setPending(false)
    setError(null)
  }

  async function exportPng() {
    if (!session.image) return
    try {
      const source = await dataUrlToCanvas(session.image)
      const blob = await new Promise<Blob>((resolve, reject) => {
        source.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode image'))), 'image/png')
      })
      saveBlob(blob, { filename: session.fileName || 'image.png', mimeType: 'image/png' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const statusText = (() => {
    if (!loaded) return pending ? 'Loading image…' : 'No image loaded'
    if (appliedFilter === 'None' && appliedTransform === 'None') return 'No edits applied'
    const parts: string[] = []
    if (appliedFilter !== 'None') parts.push(`Filter: ${appliedFilter}`)
    if (appliedTransform !== 'None') parts.push(`Transform: ${appliedTransform}`)
    return parts.join(' | ')
  })()

  return (
    <AppShell
      name="Photo Editor Filters"
      icon="paint"
      hue="rust"
      category="Productivity"
      status={statusText}
      side={
        <Rail
          title="Photo Editor Filters"
          note={loaded ? `${session.width} × ${session.height}` : 'No image'}
          chips={['Filter', 'Transform', 'PNG export']}
        />
      }
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
        {!loaded && !pending ? (
          <Card title="Image">
            <div
              onDrop={onDrop}
              onDragOver={(event) => event.preventDefault()}
              style={{ display: 'flex', justifyContent: 'center', padding: 'calc(8px * var(--sf))' }}
            >
              <EmptyState
                mono="No image"
                actionLabel="Browse files"
                onAction={() => fileRef.current?.click()}
                title={
                  <span
                    className="photo-drop-zone"
                    onClick={() => fileRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                  >
                    Drop image here or click to browse
                  </span>
                }
                detail="PNG or JPEG, kept on this device"
              />
            </div>
          </Card>
        ) : (
          <Card mono="SOURCE" title="Image">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))', alignItems: 'flex-start' }}>
              <div
                style={{
                  flex: '1 1 auto',
                  minWidth: 'calc(240px * var(--sf))',
                  maxWidth: 'calc(480px * var(--sf))',
                  overflow: 'hidden',
                }}
              >
                <canvas
                  ref={(el) => {
                    canvasRef.current = el
                  }}
                  width={session.width || 300}
                  height={session.height || 200}
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
              </div>
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
                {loaded ? (
                  <>
                    <span>{session.fileName}</span>
                    <span style={{ color: 'var(--ink-60)' }}>
                      {session.width} × {session.height}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--ink-60)' }}>Loading…</span>
                )}
              </div>
            </div>
          </Card>
        )}

        {loaded && (
          <Card mono="EDIT" title="Adjust">
            <FormGrid>
              <Select label="Filter" value={pendingFilter} onChange={onFilterChange} options={FILTERS} />
              <Select label="Transform" value={pendingTransform} onChange={onTransformChange} options={TRANSFORMS} />
            </FormGrid>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))' }}>
              <Button kind="primary" onClick={() => void apply()}>
                Apply
              </Button>
              <Button kind="secondary" onClick={reset}>
                Reset
              </Button>
              <Button kind="secondary" onClick={exportPng}>
                Export PNG
              </Button>
              <Button kind="ghost" onClick={clear}>
                Clear
              </Button>
            </div>
          </Card>
        )}

        {error ? (
          <p role="alert" style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>
            {error}
          </p>
        ) : null}
      </Stack>
    </AppShell>
  )
}
