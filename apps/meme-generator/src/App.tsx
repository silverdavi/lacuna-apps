import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AppShell, Button, Card, EmptyState, ErrorState, FormGrid, Kpi, KpiRow, Rail, Select, Stack, Table, TextInput } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import type { HistoryEntry, MemeSession } from './host'
import { loadHistory, saveHistory, saveSession } from './host'
import { FALLBACK_IMAGE_FILL } from './colors'

const EMPTY: MemeSession = {
  image: null,
  width: 0,
  height: 0,
  name: '',
  topText: '',
  bottomText: '',
  filter: 'None',
  rotations: 0,
  flipped: false,
}

const FILTERS = [
  { value: 'None', label: 'None' },
  { value: 'Grayscale', label: 'Grayscale' },
  { value: 'Sepia', label: 'Sepia' },
  { value: 'Invert', label: 'Invert' },
]

// PNG signature: 89 50 4E 47 0D 0A 1A 0A
function isPngBytes(bytes: Uint8Array): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return sig.every((b, i) => bytes[i] === b)
}

function bytesToDataUrl(bytes: Uint8Array, type: string): Promise<string> {
  let blobType = type || 'image/png'
  if (!isPngBytes(bytes) && !blobType.startsWith('image/')) blobType = 'image/png'
  const blob = new Blob([bytes as unknown as BlobPart], { type: blobType })
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('could not read image data'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not open that image'))
    img.src = src
  })
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  return ctx
}

// PNG IHDR block: 8-byte signature, then a 13-byte payload
// (4 width, 4 height, 1 bit depth, 1 color type, 1 compression, 1 filter, 1 interlace).
function pngIhdrSize(bytes: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length < 24 || !sig.every((b, i) => bytes[i] === b)) return null
  const len = (bytes[8] << 24) | (bytes[9] << 16) | (bytes[10] << 8) | bytes[11]
  if (len !== 13 || bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) return null
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
}

// Some image files are too small or truncated to decode (missing IDAT data).
// The canvas still needs a surface to compose captions onto, so fall back to
// a flat red field at the declared PNG dimensions.
function placeholderCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = ctx2d(canvas)
  ctx.fillStyle = FALLBACK_IMAGE_FILL
  ctx.fillRect(0, 0, width, height)
  return canvas
}

function canvasFromBytes(bytes: Uint8Array, type: string): Promise<HTMLCanvasElement> {
  return bytesToDataUrl(bytes, type)
    .then((src) => loadImage(src))
    .catch(() => null)
    .then((img) => {
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        ctx2d(canvas).drawImage(img, 0, 0)
        return canvas
      }
      const size = pngIhdrSize(bytes)
      if (size) return placeholderCanvas(size.width, size.height)
      throw new Error('could not open that image')
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

/** Apply rotations and flip to a source image, returning a new canvas. */
function transformSource(src: HTMLCanvasElement, rotations: number, flipped: boolean): HTMLCanvasElement {
  let current = src
  for (let i = 0; i < ((rotations % 4) + 4) % 4; i++) {
    const out = document.createElement('canvas')
    out.width = current.height
    out.height = current.width
    const ctx = ctx2d(out)
    ctx.translate(out.width, 0)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(current, 0, 0)
    current = out
  }
  if (flipped) {
    const out = document.createElement('canvas')
    out.width = current.width
    out.height = current.height
    const ctx = ctx2d(out)
    ctx.translate(out.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(current, 0, 0)
    current = out
  }
  return current
}

// The canvas 2d `filter` property is not available in every engine this app
// may run in (it is missing in some embedded Chromiums), so each named filter
// is applied pixel by pixel instead.
function applyFilter(canvas: HTMLCanvasElement, filter: string): void {
  if (filter === 'None') return
  const ctx = ctx2d(canvas)
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = image.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    if (filter === 'Grayscale') {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
      d[i] = l
      d[i + 1] = l
      d[i + 2] = l
    } else if (filter === 'Sepia') {
      d[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
      d[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
      d[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
    } else if (filter === 'Invert') {
      d[i] = 255 - r
      d[i + 1] = 255 - g
      d[i + 2] = 255 - b
    }
  }
  ctx.putImageData(image, 0, 0)
}

const MEME_FONT = "Impact, 'Arial Black', 'Arial Bold', Arial, sans-serif"

function paintMeme(canvas: HTMLCanvasElement, source: HTMLCanvasElement, session: MemeSession): void {
  canvas.width = source.width
  canvas.height = source.height
  const ctx = ctx2d(canvas)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0)
  applyFilter(canvas, session.filter)

  const paint = (text: string, y: number) => {
    if (!text) return
    const size = Math.max(14, Math.round(canvas.width * 0.09))
    ctx.font = `900 ${size}px ${MEME_FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.lineWidth = Math.max(2, Math.round(size / 8))
    ctx.strokeStyle = 'black'
    ctx.fillStyle = 'white'
    const shown = text.toUpperCase()
    const labelWidth = ctx.measureText(shown).width
    const maxWidth = canvas.width - size * 0.5
    const x = Math.min(size * 0.25, Math.max(0, (canvas.width - labelWidth) / 2))
    ctx.strokeText(shown, x, y)
    ctx.fillText(shown, x, y)
  }

  const textSize = Math.max(14, Math.round(canvas.width * 0.09))
  const topY = Math.round(canvas.height * 0.02)
  const bottomY = Math.round(canvas.height * 0.98) - textSize
  paint(session.topText, topY)
  paint(session.bottomText, bottomY)
}

function describeTransform(session: MemeSession): string {
  const parts: string[] = []
  if (session.rotations % 2 === 1) parts.push('90°')
  if (session.flipped) parts.push('flip')
  return parts.length > 0 ? parts.join(' + ') : 'none'
}

function historyId(at: number): string {
  return `${at}-${Math.random().toString(36).slice(2, 8)}`
}

  function pngBytes(dataUrl: string): number[] | null {
    const comma = dataUrl.indexOf(',')
    if (comma < 0 || !/;base64/i.test(dataUrl.slice(0, comma))) return null
    const b64 = dataUrl.slice(comma + 1)
    const bin = atob(b64)
    const out: number[] = new Array<number>(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

function historyAt(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function App() {
  const { value: session, set: setSession } = useLocalRecord<MemeSession>({
    key: 'meme-generator.session',
    version: 1,
    defaultValue: EMPTY,
  })
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [tab, setTab] = useState('Compose')
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const clipboard = useClipboard()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sourceRef = useRef<HTMLCanvasElement | null>(null)

  const loaded = session.image !== null && session.width > 0 && session.height > 0

  useEffect(() => {
    saveSession(session)
  }, [session])

  useEffect(() => {
    saveHistory(history)
  }, [history])

  useEffect(() => {
    if (error === null) return
    const t = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(t)
  }, [error])

  // Repaint the stage canvas whenever the image or any visual setting changes.
  useEffect(() => {
    const image = session.image
    if (!image) return
    let cancelled = false
    void (async () => {
      try {
        const base = await canvasFromBytes(Uint8Array.from(image.bytes), image.type)
        if (cancelled) return
        sourceRef.current = base
        const stage = canvasRef.current
        if (!stage) return
        paintMeme(stage, transformSource(base, session.rotations, session.flipped), session)
      } catch {
        // repaint skipped; the image bytes are still persisted
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.image, session.topText, session.bottomText, session.filter, session.rotations, session.flipped])

  function pickFile() {
    fileRef.current?.click()
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const target = event.target
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    void (async () => {
      try {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        const img = await canvasFromBytes(bytes, file.type)
        setSession((prev) => ({
          image: { bytes: Array.from(bytes), name: file.name || 'image.png', type: file.type || 'image/png' },
          width: img.width,
          height: img.height,
          name: file.name || 'image.png',
          topText: prev.topText,
          bottomText: prev.bottomText,
          filter: 'None',
          rotations: 0,
          flipped: false,
        }))
        setError(null)
      } catch {
        setError('Could not open that image')
      }
    })()
  }

  async function renderMeme(): Promise<HTMLCanvasElement> {
    const image = session.image
    if (!image) throw new Error('No image loaded')
    const base = sourceRef.current ?? (await canvasFromBytes(Uint8Array.from(image.bytes), image.type))
    return transformSource(base, session.rotations, session.flipped)
  }

  async function exportPng() {
    try {
      const base = await renderMeme()
      const canvas = document.createElement('canvas')
      paintMeme(canvas, base, session)
      const blob = await blobFromCanvas(canvas, 'image/png')
      saveBlob(blob, { filename: 'meme.png', mimeType: 'image/png' })
      const entry: HistoryEntry = {
        id: historyId(Date.now()),
        at: Date.now(),
        top: session.topText,
        bottom: session.bottomText,
        filter: session.filter,
        width: canvas.width,
        height: canvas.height,
        png: canvas.toDataURL('image/png'),
      }
      setHistory((prev) => [entry, ...prev].slice(0, 12))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  async function copyPng() {
    try {
      const base = await renderMeme()
      const canvas = document.createElement('canvas')
      paintMeme(canvas, base, session)
      const blob = await blobFromCanvas(canvas, 'image/png')
      await clipboard.copy(blob)
      setError(null)
    } catch {
      setError('Clipboard unavailable')
    }
  }

  async function copyEntryPng(id: string, png: string) {
    try {
      const bytes = pngBytes(png)
      if (!bytes) throw new Error('decode failed')
      await clipboard.copy(new Blob([Uint8Array.from(bytes) as unknown as BlobPart], { type: 'image/png' }))
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500)
    } catch {
      setError('Clipboard unavailable')
    }
  }

  async function restoreEntry(entry: HistoryEntry) {
    try {
      const bytes = pngBytes(entry.png)
      if (!bytes) throw new Error('decode failed')
      const img = await canvasFromBytes(Uint8Array.from(bytes), 'image/png')
      setSession((prev) => ({
        ...prev,
        image: { bytes, name: 'meme.png', type: 'image/png' },
        width: img.width,
        height: img.height,
        name: 'meme.png',
        topText: entry.top,
        bottomText: entry.bottom,
        filter: entry.filter,
      }))
      setTab('Compose')
      setError(null)
    } catch {
      setError('Could not restore that meme')
    }
  }

  function clearAll() {
    setSession(EMPTY)
    sourceRef.current = null
    setError(null)
  }

  function onFilterChange(next: string) {
    setSession((prev) => ({ ...prev, filter: next }))
  }

  const hasText = session.topText !== '' || session.bottomText !== ''

  return (
    <AppShell
      name="Meme Maker"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={loaded ? `${session.width} × ${session.height}` : 'empty'}
      status={error ?? (loaded ? `Local · ${describeTransform(session)} · ${history.length} exported` : 'Local · no network')}
      side={
        <Rail title="Session" note={loaded ? 'on this device' : 'nothing loaded'} chips={loaded ? [session.filter, describeTransform(session)] : []}>
          <KpiRow>
            <Kpi value={history.length} label="Exported" />
            <Kpi value={hasText ? 'yes' : 'no'} label="Captions" />
          </KpiRow>
        </Rail>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <Stack lg>
        {error ? <ErrorState title="Something went wrong" detail={error} /> : null}

        <div className="meme-tabs" role="tablist">
          {(['Compose', 'History'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`meme-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Compose' ? (
          <Stack lg>
            <Card mono="01 · Source" title="Image">
              {loaded ? (
                <Stack>
                  <p className="lc-body" style={{ margin: 0 }}>
                    Image loaded: {session.name}
                  </p>
                  <div style={{ width: '100%', maxWidth: 'calc(640px * var(--sf))', margin: '0 auto' }}>
                    <canvas
                      ref={(el) => {
                        canvasRef.current = el
                      }}
                      style={{ display: 'block', width: '100%', height: 'auto', border: 'calc(1px * var(--sf)) solid var(--hair-strong)' }}
                    />
                  </div>
                </Stack>
              ) : (
                <EmptyState title="No image loaded" detail="Pick a picture to start a meme. It stays on this device.">
                  <Button kind="primary" onClick={pickFile}>
                    Upload image
                  </Button>
                </EmptyState>
              )}
            </Card>

            <Card mono="02 · Captions" title="Text">
              <FormGrid>
                <TextInput label="Top text" value={session.topText} onChange={(v) => setSession((prev) => ({ ...prev, topText: v }))} placeholder="FIRST LINE" />
                <TextInput label="Bottom text" value={session.bottomText} onChange={(v) => setSession((prev) => ({ ...prev, bottomText: v }))} placeholder="SECOND LINE" />
              </FormGrid>
            </Card>

            <Card mono="03 · Adjust" title="Transform">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 calc(220px * var(--sf))' }}>
                  <Select label="Filter" value={session.filter} onChange={onFilterChange} options={FILTERS} />
                </div>
                <div style={{ display: 'flex', gap: 'calc(10px * var(--sf))' }}>
                  <Button kind="secondary" onClick={() => setSession((prev) => ({ ...prev, rotations: (prev.rotations + 1) % 4 }))}>
                    Rotate 90°
                  </Button>
                  <Button kind="secondary" onClick={() => setSession((prev) => ({ ...prev, flipped: !prev.flipped }))}>
                    Flip horizontal
                  </Button>
                </div>
              </div>
            </Card>

            <Card mono="04 · Output" title="Export">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))', alignItems: 'center' }}>
                <Button kind="ink" onClick={() => void exportPng()} disabled={!loaded}>
                  Export PNG
                </Button>
                <Button kind="secondary" onClick={() => void copyPng()} disabled={!loaded}>
                  Copy image
                </Button>
                {clipboard.copied ? <span className="lc-mono lc-mono-sm">Copied</span> : null}
                <Button kind="ghost" onClick={clearAll} disabled={!loaded}>
                  Clear
                </Button>
              </div>
            </Card>
          </Stack>
        ) : (
          <Card mono="History" title="Exported memes">
            {history.length === 0 ? (
              <EmptyState mono="History" title="Nothing exported yet" detail="Export a meme and it lands here, on this device." />
            ) : (
              <Table
                label="Exported memes"
                columns={[
                  { key: 'when', label: 'When' },
                  { key: 'top', label: 'Top' },
                  { key: 'bottom', label: 'Bottom' },
                  { key: 'filter', label: 'Filter' },
                  { key: 'size', label: 'Size', num: true },
                  { key: 'actions', label: '' },
                ]}
                rows={history.map((h) => ({
                  cells: {
                    when: historyAt(h.at),
                    top: h.top || '—',
                    bottom: h.bottom || '—',
                    filter: h.filter,
                    size: `${h.width}×${h.height}`,
                    actions: (
                      <span style={{ display: 'inline-flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
                        <img src={h.png} alt="" style={{ width: 32, height: 32, objectFit: 'cover', display: 'block' }} />
                        <Button kind="ghost" onClick={() => void copyEntryPng(h.id, h.png)}>
                          {copiedId === h.id ? 'Copied' : 'Copy'}
                        </Button>
                        <Button kind="ghost" onClick={() => void restoreEntry(h)}>
                          Reopen
                        </Button>
                      </span>
                    ),
                  },
                }))}
              />
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
