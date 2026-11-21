import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, KpiRow, Kpi, Rail, Select, Stack, Table, Tag, Divider } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import { useClipboard } from '@lacuna/use-clipboard'
import { BeforeAfter } from '@lacuna/before-after'
import { RangeSlider } from '@lacuna/range-slider'
import type { SessionState, EditHistory } from './host'
import { loadHistory, saveHistory } from './host'

const FILTERS = ['None', 'Grayscale', 'Sepia', 'Invert']
const TRANSFORMS = ['None', 'Rotate 90°', 'Rotate 180°', 'Flip Horizontal', 'Flip Vertical']
const FILTER_NAMES: Record<string, string> = {
  Grayscale: 'grayscale',
  Sepia: 'sepia',
  Invert: 'invert',
}

const DEFAULT_STATE: SessionState = {
  original: null,
  image: null,
  fileName: '',
  width: 0,
  height: 0,
  filter: 'None',
  transform: 'None',
}

interface PresetState {
  brightness: number
  contrast: number
  saturation: number
  hueRotate: number
  blur: number
}

const DEFAULT_PRESET: PresetState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hueRotate: 0,
  blur: 0,
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

function cssFilter(filter: string, preset: PresetState): string {
  const parts: string[] = []
  if (preset.brightness !== 100) parts.push(`brightness(${preset.brightness}%)`)
  if (preset.contrast !== 100) parts.push(`contrast(${preset.contrast}%)`)
  if (preset.saturation !== 100) parts.push(`saturate(${preset.saturation}%)`)
  if (preset.hueRotate !== 0) parts.push(`hue-rotate(${preset.hueRotate}deg)`)
  if (preset.blur > 0) parts.push(`blur(${preset.blur}px)`)
  const base = FILTER_NAMES[filter]
  if (base) parts.push(`${base}(100%)`)
  return parts.length > 0 ? parts.join(' ') : 'none'
}

function filterLabel(filter: string, preset: PresetState): string {
  const parts: string[] = []
  if (filter !== 'None') parts.push(filter)
  if (preset.brightness !== 100) parts.push(`Brightness ${preset.brightness}%`)
  if (preset.contrast !== 100) parts.push(`Contrast ${preset.contrast}%`)
  if (preset.saturation !== 100) parts.push(`Saturation ${preset.saturation}%`)
  if (preset.hueRotate !== 0) parts.push(`Hue ${preset.hueRotate}°`)
  if (preset.blur > 0) parts.push(`Blur ${preset.blur}px`)
  return parts.length > 0 ? parts.join(', ') : 'None'
}

function isPresetChanged(filter: string, preset: PresetState): boolean {
  return filter !== 'None' || preset.brightness !== 100 || preset.contrast !== 100 || preset.saturation !== 100 || preset.hueRotate !== 0 || preset.blur > 0
}

async function applyEdit(
  src: string,
  filter: string,
  transform: string,
  preset: PresetState,
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

  const filterStr = cssFilter(filter, preset)
  if (filterStr !== 'none') ctx.filter = filterStr
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

  const [view, setView] = useState<'edit' | 'history'>('edit')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [filter, setFilter] = useState(session.filter)
  const [transform, setTransform] = useState(session.transform)
  const [preset, setPreset] = useState<PresetState>(DEFAULT_PRESET)
  const [appliedFilter, setAppliedFilter] = useState(session.filter)
  const [appliedTransform, setAppliedTransform] = useState(session.transform)
  const [appliedPreset, setAppliedPreset] = useState<PresetState>(DEFAULT_PRESET)
  const [history, setHistory] = useState<EditHistory[]>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { copy, copied } = useClipboard({ timeoutMs: 2000 })

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const loaded = session.image !== null

  useEffect(() => {
    const image = session.image
    if (!image) return
    void (async () => {
      try {
        const canvas = canvasRef.current
        if (!canvas) return
        await paintPreview(canvas, image)
      } catch {
        // repaint skipped
      }
    })()
  }, [session.image])

  function onFilterChange(value: string) {
    setFilter(value)
  }

  function onTransformChange(value: string) {
    setTransform(value)
  }

  function onFileSelected(file: File) {
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
          setFilter('None')
          setTransform('None')
          setPreset(DEFAULT_PRESET)
          setAppliedFilter('None')
          setAppliedTransform('None')
          setAppliedPreset(DEFAULT_PRESET)
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
    const f = filter
    const t = transform
    const p = { ...preset }
    // Persist filter and transform immediately, before the async edit completes
    localStorage.setItem('photo-editor.session', JSON.stringify({
      version: 1,
      data: { ...session, filter: f, transform: t },
    }))
    try {
      const result = await applyEdit(image, f, t, p)
      const newSession = {
        ...session,
        image: result.url,
        width: result.width,
        height: result.height,
        filter: f,
        transform: t,
      }
      // Persist immediately to ensure it's saved before any reload
      localStorage.setItem('photo-editor.session', JSON.stringify({ version: 1, data: newSession }))
      setSession(newSession)
      setAppliedFilter(f)
      setAppliedTransform(t)
      setAppliedPreset(p)
      setError(null)

      const entry: EditHistory = {
        id: Date.now(),
        fileName: session.fileName,
        filter: f !== 'None' ? filterLabel(f, p) : null,
        transform: t !== 'None' ? t : null,
        timestamp: new Date().toISOString(),
      }
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 20)
        saveHistory(next)
        return next
      })
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
    setFilter('None')
    setTransform('None')
    setPreset(DEFAULT_PRESET)
    setAppliedFilter('None')
    setAppliedTransform('None')
    setAppliedPreset(DEFAULT_PRESET)
    setPending(false)
    setError(null)
  }

  function clear() {
    setSession(DEFAULT_STATE)
    setFilter('None')
    setTransform('None')
    setPreset(DEFAULT_PRESET)
    setAppliedFilter('None')
    setAppliedTransform('None')
    setAppliedPreset(DEFAULT_PRESET)
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

  async function copyToClipboard() {
    if (!session.image) return
    try {
      const source = await dataUrlToCanvas(session.image)
      const blob = await new Promise<Blob>((resolve, reject) => {
        source.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode image'))), 'image/png')
      })
      await copy(blob)
    } catch {
      // clipboard may be unavailable
    }
  }

  function restoreFromHistory(entry: EditHistory) {
    // Re-apply the edit to the original image
    const original = session.original
    if (!original) return
    const filter = entry.filter ? entry.filter.split(',')[0] : 'None'
    void (async () => {
      try {
        const result = await applyEdit(original, filter, entry.transform ?? 'None', { ...DEFAULT_PRESET })
        setSession((prev) => ({
          ...prev,
          image: result.url,
          width: result.width,
          height: result.height,
          filter,
          transform: entry.transform ?? 'None',
        }))
        setAppliedFilter(filter)
        setAppliedTransform(entry.transform ?? 'None')
        setError(null)
        setView('edit')
      } catch {
        setError('Could not restore that edit')
      }
    })()
  }

  function deleteHistoryEntry(id: number) {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id)
      saveHistory(next)
      return next
    })
  }

  const statusText = (() => {
    if (!loaded) return pending ? 'Loading image…' : 'No image loaded'
    if (appliedFilter === 'None' && appliedTransform === 'None' && !isPresetChanged(appliedFilter, appliedPreset)) return 'No edits applied'
    const parts: string[] = []
    if (appliedFilter !== 'None') parts.push(`Filter: ${filterLabel(appliedFilter, appliedPreset)}`)
    if (appliedTransform !== 'None') parts.push(`Transform: ${appliedTransform}`)
    return parts.length > 0 ? parts.join(' | ') : 'No edits applied'
  })()

  const hasEdits = loaded && (appliedFilter !== 'None' || appliedTransform !== 'None' || isPresetChanged(appliedFilter, appliedPreset))

  const tableRows = history.map((h) => ({
    cells: {
      time: new Date(h.timestamp).toLocaleString(),
      file: h.fileName,
      filter: h.filter ?? '—',
      transform: h.transform ?? '—',
      actions: (
        <>
          <Button kind="ghost" onClick={() => restoreFromHistory(h)}>
            Restore
          </Button>
          <Button kind="ghost" onClick={() => deleteHistoryEntry(h.id)}>
            Delete
          </Button>
        </>
      ),
    },
  }))

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
          chips={['Filter', 'Transform', 'PNG export', 'History']}
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
        <div className="pe-tabs" role="tablist">
          {(['Edit', 'History'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === (item === 'Edit' ? 'edit' : 'history')}
              className={view === (item === 'Edit' ? 'edit' : 'history') ? 'pe-tab active' : 'pe-tab'}
              onClick={() => setView(item === 'Edit' ? 'edit' : 'history')}
            >
              {item}
            </button>
          ))}
        </div>

        {view === 'edit' ? (
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
                  <Select label="Filter" value={filter} onChange={onFilterChange} options={FILTERS} />
                  <Select label="Transform" value={transform} onChange={onTransformChange} options={TRANSFORMS} />
                </FormGrid>
                <Divider />
                <Stack>
                  <RangeSlider
                    label="Brightness"
                    value={preset.brightness}
                    onChange={(v) => setPreset((prev) => ({ ...prev, brightness: v }))}
                    min={0}
                    max={200}
                    step={5}
                    format={(v) => `${v}%`}
                  />
                  <RangeSlider
                    label="Contrast"
                    value={preset.contrast}
                    onChange={(v) => setPreset((prev) => ({ ...prev, contrast: v }))}
                    min={0}
                    max={200}
                    step={5}
                    format={(v) => `${v}%`}
                  />
                  <RangeSlider
                    label="Saturation"
                    value={preset.saturation}
                    onChange={(v) => setPreset((prev) => ({ ...prev, saturation: v }))}
                    min={0}
                    max={200}
                    step={5}
                    format={(v) => `${v}%`}
                  />
                  <RangeSlider
                    label="Hue rotate"
                    value={preset.hueRotate}
                    onChange={(v) => setPreset((prev) => ({ ...prev, hueRotate: v }))}
                    min={-180}
                    max={180}
                    step={5}
                    format={(v) => `${v}°`}
                  />
                  <RangeSlider
                    label="Blur"
                    value={preset.blur}
                    onChange={(v) => setPreset((prev) => ({ ...prev, blur: v }))}
                    min={0}
                    max={20}
                    step={1}
                    format={(v) => `${v}px`}
                  />
                </Stack>
                <Divider />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))' }}>
                  <Button kind="primary" onClick={() => void apply()}>
                    Apply
                  </Button>
                  <Button kind="secondary" onClick={reset}>
                    Reset
                  </Button>
                  <Button kind="secondary" onClick={() => void exportPng()}>
                    Export PNG
                  </Button>
                  <Button kind="secondary" onClick={() => void copyToClipboard()}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button kind="ghost" onClick={clear}>
                    Clear
                  </Button>
                </div>
              </Card>
            )}

            {loaded && hasEdits && session.original && session.image !== session.original && (
              <Card mono="COMPARE" title="Before / After">
                <BeforeAfter
                  before={
                    <img
                      src={session.original}
                      alt="Original"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  }
                  after={
                    session.image ? (
                      <img
                        src={session.image}
                        alt="Edited"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    ) : null
                  }
                  ariaLabel="Before and after comparison"
                />
              </Card>
            )}

            {error ? (
              <p role="alert" style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>
                {error}
              </p>
            ) : null}
          </Stack>
        ) : (
          <Card mono="HISTORY" title="Edit History">
            <KpiRow>
              <Kpi value={history.length} label="Edits" />
              <Kpi value={loaded ? session.fileName : '—'} label="Current" />
            </KpiRow>
            <Divider />
            <Table
              columns={[
                { key: 'time', label: 'When' },
                { key: 'file', label: 'File' },
                { key: 'filter', label: 'Filter' },
                { key: 'transform', label: 'Transform' },
                { key: 'actions', label: '' },
              ]}
              rows={tableRows}
              empty="No edits yet — apply a filter or transform to start building history"
              label="Edit history"
            />
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
