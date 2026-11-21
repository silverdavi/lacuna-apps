import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Tag,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import type { ImageData } from '@lacuna/image-ops'
import { BeforeAfter } from '@lacuna/before-after'
import { RangeSlider } from '@lacuna/range-slider'
import { useClipboard } from '@lacuna/use-clipboard'
import { useAnnotation } from './host/mock'
import type { Layer } from './host'

function loadImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Could not read that image'))
      img.src = dataUrl
    }
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(file)
  })
}

function transformCanvas(src: HTMLImageElement, rotations: number, flipped: boolean): HTMLCanvasElement {
  let current = document.createElement('canvas')
  current.width = src.naturalWidth
  current.height = src.naturalHeight
  const initCtx = current.getContext('2d')
  if (!initCtx) throw new Error('Canvas is not available')
  initCtx.drawImage(src, 0, 0)
  for (let i = 0; i < ((rotations / 90) % 4 + 4) % 4; i++) {
    const out = document.createElement('canvas')
    out.width = current.height
    out.height = current.width
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.translate(out.width, 0)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(current, 0, 0)
    current = out
  }
  if (flipped) {
    const out = document.createElement('canvas')
    out.width = current.width
    out.height = current.height
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.translate(out.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(current, 0, 0)
    current = out
  }
  return current
}

function annotationFont(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const size = Math.max(14, Math.round(canvas.width * 0.07))
  ctx.font = `${size}px sans-serif`
  return size
}

function drawAnnotations(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, layers: Layer[], opacity: number) {
  ctx.globalAlpha = opacity / 100
  const size = annotationFont(ctx, canvas)
  ctx.lineWidth = Math.max(2, Math.round(size / 8))
  for (const layer of layers) {
    if (layer.kind === 'text') {
      ctx.font = `${size}px sans-serif`
      ctx.fillStyle = 'var(--ink)'
      ctx.fillText(layer.content, layer.x, layer.y)
    } else {
      ctx.strokeStyle = 'var(--accent)'
      ctx.strokeRect(layer.x, layer.y, layer.w, layer.h)
    }
  }
}

export function App() {
  const { value: state, set: setState } = useAnnotation()
  const [tab, setTab] = useState('Tools')
  const [status, setStatus] = useState<string | null>(() => (state.image ? `Loaded: ${state.imageName ?? 'image'}` : null))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(100)
  const [original, setOriginal] = useState<string | null>(null)
  const [annotated, setAnnotated] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { copied, copy } = useClipboard()

  useEffect(() => {
    if (!state.image) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      imageRef.current = img
      setOriginal(state.image)
    }
    img.src = state.image
    return () => {
      cancelled = true
    }
  }, [state.image])

  const image = state.image ? imageRef.current : null

  const rendered = useMemo(() => {
    if (!image) return null
    return transformCanvas(image, state.rotation, state.flipped)
  }, [image, state.rotation, state.flipped])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !rendered) return
    canvas.width = rendered.width
    canvas.height = rendered.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(rendered, 0, 0)
    drawAnnotations(ctx, canvas, state.layers, opacity)
    setAnnotated(canvas.toDataURL())
  }, [rendered, state.layers, opacity])

  function handleFile(file: File) {
    setLoadError(null)
    loadImageFile(file)
      .then(({ dataUrl, width, height }) => {
        setState((s) => ({ ...s, image: dataUrl, imageName: file.name, imageWidth: width, imageHeight: height, layers: [] }))
        setStatus(`Loaded: ${file.name}`)
      })
      .catch(() => setLoadError('That file is not a readable image'))
  }

  function addText() {
    const n = state.layers.filter((l) => l.kind === 'text').length + 1
    setState((s) => ({
      ...s,
      layers: [...s.layers, { kind: 'text', id: `text-${Date.now()}-${n}`, content: `Label ${n}`, x: 40, y: 40 }],
    }))
  }

  function addShape() {
    setState((s) => ({
      ...s,
      layers: [...s.layers, { kind: 'shape', id: `shape-${Date.now()}`, shape: 'rectangle', x: 120, y: 80, w: 140, h: 90 }],
    }))
  }

  function deleteLast() {
    setState((s) => ({ ...s, layers: s.layers.slice(0, -1) }))
  }

  function rotate() {
    if (!image) return
    setState((s) => ({ ...s, rotation: (s.rotation + 90) % 360 }))
    setStatus('Rotated: 90°')
  }

  function flip() {
    if (!image) return
    setState((s) => ({ ...s, flipped: !s.flipped }))
    setStatus('Flipped: horizontal')
  }

  async function exportPng() {
    if (!annotated) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, { filename: 'annotated.png', mimeType: 'image/png' })
    }, 'image/png')
  }

  function copySummary() {
    void copy(state.layers.map((l) => (l.kind === 'text' ? l.content : 'Rectangle')).join(', '))
  }

  const hasLayers = state.layers.length > 0

  return (
    <AppShell
      name="Screenshot Annotator"
      icon="paint"
      hue="rust"
      category="Productivity"
      meta={`${state.layers.length} ${state.layers.length === 1 ? 'layer' : 'layers'}`}
      status={status ?? 'Nothing loaded'}
      side={
        <Rail
          title="Screenshot Annotator"
          note="One image · local"
          chips={['Text labels', 'Shapes', 'Rotate and flip', 'PNG export']}
        />
      }
    >
      <Card mono="Source" title="Image" actions={
        <>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = '' }} />
          <Button kind="primary" ariaLabel="Load image" onClick={() => fileInputRef.current?.click()}>Load image</Button>
        </>
      }>
        {loadError ? <p style={{ fontFamily: 'var(--sans)', fontSize: 'calc(13px * var(--tf))', color: 'var(--danger)' }}>{loadError}</p> : null}
      </Card>

      <Card mono={hasLayers ? `${state.layers.length} layers` : 'Empty'} title="Layers">
        {hasLayers ? (
          <List label="Layers">
            {state.layers.map((l) => (
              <Row
                key={l.id}
                title={l.kind === 'text' ? `Text: ${l.content}` : 'Shape: Rectangle'}
                action={
                  <Button kind="ghost" ariaLabel={`Remove ${l.kind === 'text' ? l.content : 'shape'}`} onClick={deleteLast}>
                    Remove
                  </Button>
                }
              />
            ))}
          </List>
        ) : (
          <EmptyState mono="Empty" title="No layers yet" detail="Add a label or a shape in the Tools tab." />
        )}
      </Card>

      <Card mono="Edit" title="Edit" actions={
        <div role="tablist" aria-label="Edit tools" style={{ display: 'flex', gap: 'calc(6px * var(--sf))' }}>
          {['Tools', 'Image'].map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`ann-tab${tab === item ? ' active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      }>
        {tab === 'Tools' ? (
          <>
            <KpiRow>
              <Kpi value={String(state.layers.length)} label="Layers" accent />
            </KpiRow>
            <RangeSlider label="Ink opacity" value={opacity} onChange={setOpacity} min={10} max={100} step={5} format={(v) => `${v}%`} />
            <Actions>
              <Button kind="primary" onClick={addText}>Add text</Button>
              <Button onClick={addShape}>Add rectangle</Button>
              <Button kind="danger" onClick={deleteLast} disabled={!hasLayers}>Delete last</Button>
            </Actions>
          </>
        ) : (
          <>
            <KpiRow>
              <Kpi value={`${state.rotation}°`} label="Rotation" accent />
              <Kpi value={state.flipped ? 'Yes' : 'No'} label="Flipped" />
            </KpiRow>
            <Actions>
              <Button kind="primary" onClick={rotate} disabled={!image}>Rotate 90°</Button>
              <Button onClick={flip} disabled={!image}>Flip horizontal</Button>
            </Actions>
          </>
        )}
      </Card>

      <Card mono="Preview" title="Canvas" actions={<Button kind="primary" onClick={() => void exportPng()} disabled={!annotated}>Export PNG</Button>}>
        {!rendered ? (
          <EmptyState mono="No image" title="No image loaded" detail="Load an image to start annotating." />
        ) : (
          <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto', borderRadius: 'calc(4px * var(--sf))' }} />
        )}
      </Card>

      <Card mono="Compare" title="Before and after" actions={<Button onClick={copySummary} ariaLabel="Copy summary" disabled={!original}>Copy summary</Button>}>
        {!original || !annotated ? (
          <EmptyState mono="No image" title="Nothing to compare" detail="Load an image to compare the original with the annotated version." />
        ) : (
          <BeforeAfter
            mode="side-by-side"
            ariaLabel="Original and annotated"
            before={
              <div style={{ padding: 'calc(8px * var(--sf))' }}>
                <Tag>Original</Tag>
                <img src={original} alt="Original screenshot" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
              </div>
            }
            after={
              <div style={{ padding: 'calc(8px * var(--sf))' }}>
                <Tag accent>Annotated</Tag>
                <img src={annotated} alt="Annotated screenshot" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
              </div>
            }
          />
        )}
        {copied ? <p style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--accent)' }}>Layer summary copied</p> : null}
      </Card>
    </AppShell>
  )
}
