// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/draw-canvas 0.1.0: snapshot of lacuna-components DrawCanvas at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { usePointerDraw, type Point, type Stroke, type Transform } from '@lacuna/use-pointer-draw'
import { useUndoStack } from '@lacuna/use-undo-stack'

export interface DrawCanvasProps {
  /** Initial canvas width in logical pixels. */
  width?: number
  /** Initial canvas height in logical pixels. */
  height?: number
  /** Called with a data-URL string when the user requests PNG export. */
  onExport?: (dataUrl: string) => void
  /** Called after every committed stroke or shape so the parent can persist state. */
  onCommit?: (snapshot: string) => void
  /** Optional initial layer names; defaults to ["Layer 1"]. */
  initialLayers?: string[]
  /** Optional id for the toolbar, used as aria-controls from the page heading. */
  toolbarId?: string
}

type Tool = 'brush' | 'eraser' | 'rect' | 'ellipse' | 'line'

const TOOLS: { key: Tool; label: string }[] = [
  { key: 'brush', label: 'Brush' },
  { key: 'eraser', label: 'Eraser' },
  { key: 'rect', label: 'Rectangle' },
  { key: 'ellipse', label: 'Ellipse' },
  { key: 'line', label: 'Line' },
]

const ZOOM_MIN = 0.1
const ZOOM_MAX = 10

function tracePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  const first = points[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (p) ctx.lineTo(p.x, p.y)
  }
}

function cssVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || 'rgb(0,0,0)'
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, t: Transform): void {
  const points = stroke.points
  if (points.length === 0) return
  const color = cssVar('--ink')
  ctx.save()
  ctx.translate(t.x, t.y)
  ctx.scale(t.scale, t.scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke.width
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  if (points.length === 1) {
    const p = points[0]
    if (p) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    tracePath(ctx, points)
    ctx.stroke()
  }
  ctx.restore()
}

function drawShape(ctx: CanvasRenderingContext2D, kind: 'rect' | 'ellipse' | 'line', a: Point, b: Point, color: string, width: number, t: Transform): void {
  ctx.save()
  ctx.translate(t.x, t.y)
  ctx.scale(t.scale, t.scale)
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  if (kind === 'line') {
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  } else if (kind === 'rect') {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    const w = Math.abs(b.x - a.x)
    const h = Math.abs(b.y - a.y)
    ctx.fillRect(x, y, w, h)
  } else {
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2
    const rx = Math.abs(b.x - a.x) / 2
    const ry = Math.abs(b.y - a.y) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = cssVar('--paper-deep')
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

function toPng(el: HTMLCanvasElement): string {
  return el.toDataURL('image/png')
}

const bufferCache = new Map<string, HTMLCanvasElement>()

function rememberBuffer(src: string, srcCanvas: HTMLCanvasElement): void {
  const buf = document.createElement('canvas')
  buf.width = srcCanvas.width
  buf.height = srcCanvas.height
  const ctx = buf.getContext('2d')
  if (ctx) ctx.drawImage(srcCanvas, 0, 0)
  bufferCache.set(src, buf)
}

function bufferFor(src: string, width: number, height: number): HTMLCanvasElement | null {
  if (!src) return null
  const hit = bufferCache.get(src)
  if (hit) return hit
  const img = new Image()
  img.src = src
  const buf = document.createElement('canvas')
  buf.width = width
  buf.height = height
  bufferCache.set(src, buf)
  img.onload = () => {
    const ctx = buf.getContext('2d')
    if (ctx) ctx.drawImage(img, 0, 0)
  }
  return buf
}

function paint(el: HTMLCanvasElement, layers: string[], active: number, shape: { a: Point; b: Point } | null, kind: 'rect' | 'ellipse' | 'line' | null, t: Transform): void {
  const ctx = el.getContext('2d')
  if (!ctx) return
  clearCanvas(ctx, el.width, el.height)
  const snap = layers[active]
  if (snap) {
    const buf = bufferFor(snap, el.width, el.height)
    if (buf) ctx.drawImage(buf, 0, 0)
  }
  if (shape && kind) drawShape(ctx, kind, shape.a, shape.b, cssVar('--ink'), 2, t)
}

const pageStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))', fontFamily: 'var(--sans)', color: 'var(--ink)', background: 'var(--paper)', border: 'calc(1px * var(--sf)) solid var(--hair)', borderRadius: 'calc(8px * var(--sf))', padding: 'calc(12px * var(--sf))' }

const toolWrap: CSSProperties = { display: 'flex', gap: 'calc(4px * var(--sf))', flexWrap: 'wrap' }

const toolButton: CSSProperties = { fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))', borderRadius: 'calc(6px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer' }

const canvasBox: CSSProperties = { position: 'relative', width: 'fit-content', overflow: 'hidden', background: 'var(--paper-deep)', border: 'calc(1px * var(--sf)) solid var(--hair)', borderRadius: 'calc(6px * var(--sf))' }

const statusStyle: CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)' }

const controlStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
  borderRadius: 'calc(6px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  cursor: 'pointer',
}

export function DrawCanvas(props: DrawCanvasProps): React.ReactElement {
  const { width = 400, height = 300, onExport, onCommit, initialLayers = ['Layer 1'], toolbarId } = props
  const names = useMemo(() => initialLayers.map((n, i) => n || `Layer ${i + 1}`), [initialLayers])
  const initialSnapshots = useMemo(() => names.map(() => ''), [names])

  const stack = useUndoStack<string[]>(initialSnapshots)
  const layers = stack.value
  const [activeLayer, setActiveLayer] = useState(() => Math.max(0, names.length - 1))
  const [tool, setTool] = useState<Tool>('brush')
  const [mode, setMode] = useState<'draw' | 'pan'>('draw')
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState(1)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const layersRef = useRef<string[]>(initialSnapshots)
  const activeRef = useRef(activeLayer)
  const toolRef = useRef<Tool>(tool)
  const modeRef = useRef<'draw' | 'pan'>(mode)
  const shapeRef = useRef<{ a: Point; b: Point } | null>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })

  const { transform, resetTransform, surfaceProps } = usePointerDraw({
    onStrokeEnd: (s) => {
      const el = canvasRef.current
      if (!el) return
      paint(el, layersRef.current, activeRef.current, null, null, viewT)
      drawStroke(el.getContext('2d') as CanvasRenderingContext2D, s, viewT)
      const snap = el.toDataURL('image/png')
      rememberBuffer(snap, el)
      const next = layersRef.current.map((prev, i) => (i === activeRef.current ? snap : prev))
      stack.set(next)
      onCommit?.(toPng(el))
    },
  })

  layersRef.current = layers
  transformRef.current = transform
  activeRef.current = activeLayer
  toolRef.current = tool
  modeRef.current = mode

  const viewT: Transform = {
    x: transform.x,
    y: transform.y,
    scale: transform.scale * zoomScale,
  }

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const tk = toolRef.current
    const kind = tk === 'rect' || tk === 'ellipse' || tk === 'line' ? tk : null
    paint(el, layers, activeLayer, shapeRef.current, kind, viewT)
  }, [layers, viewT, activeLayer])

  const startPan = (e: React.PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const startX = e.clientX
    const startY = e.clientY
    const startT = transformRef.current
    const onMove = (ev: PointerEvent): void => {
      resetTransform()
      const next: Transform = {
        x: startT.x + (ev.clientX - startX),
        y: startT.y + (ev.clientY - startY),
        scale: startT.scale,
      }
      transformRef.current = next
      const el = canvasRef.current
      if (el) paint(el, layersRef.current, activeRef.current, null, null, next)
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    const el = canvasRef.current
    if (!el) return
    if (modeRef.current === 'pan') {
      startPan(e)
      return
    }
    const rect = el.getBoundingClientRect()
    const t0 = viewT
    const p: Point = {
      x: (e.clientX - rect.left - t0.x) / t0.scale,
      y: (e.clientY - rect.top - t0.y) / t0.scale,
      pressure: e.pressure,
    }
    if (toolRef.current === 'brush' || toolRef.current === 'eraser') {
      surfaceProps.onPointerDown(e)
    } else {
      shapeRef.current = { a: p, b: p }
    }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    if (modeRef.current === 'pan') return
    if (toolRef.current === 'brush' || toolRef.current === 'eraser') {
      surfaceProps.onPointerMove(e)
      return
    }
    const el = canvasRef.current
    if (!el || !shapeRef.current) return
    const rect = el.getBoundingClientRect()
    const t0 = viewT
    shapeRef.current = {
      a: shapeRef.current.a,
      b: {
        x: (e.clientX - rect.left - t0.x) / t0.scale,
        y: (e.clientY - rect.top - t0.y) / t0.scale,
        pressure: e.pressure,
      },
    }
    const tk = toolRef.current
    const kind = tk === 'rect' || tk === 'ellipse' || tk === 'line' ? tk : null
    paint(el, layers, activeLayer, shapeRef.current, kind, viewT)
  }

  const endStroke = (e: React.PointerEvent): void => {
    if (modeRef.current === 'pan') return
    if (toolRef.current === 'brush' || toolRef.current === 'eraser') {
      surfaceProps.onPointerUp(e)
      return
    }
    const el = canvasRef.current
    const shape = shapeRef.current
    if (!el || !shape) return
    shapeRef.current = null
    const tk = toolRef.current
    const kind = tk === 'rect' || tk === 'ellipse' || tk === 'line' ? tk : null
    paint(el, layers, activeLayer, shape, kind, viewT)
    const snap = el.toDataURL('image/png')
    rememberBuffer(snap, el)
    const next = layers.map((prev, i) => (i === activeRef.current ? snap : prev))
    stack.set(next)
    onCommit?.(toPng(el))
  }

  const zoomIn = (): void => {
    setZoomScale((s) => Math.min(ZOOM_MAX, s * 1.25))
  }

  const zoomOut = (): void => {
    setZoomScale((s) => Math.max(ZOOM_MIN, s / 1.25))
  }

  const doUndo = (): void => {
    stack.undo()
    setExportUrl(null)
  }

  const doRedo = (): void => {
    stack.redo()
    setExportUrl(null)
  }

  const doExport = (): void => {
    const el = canvasRef.current
    if (!el) return
    const data = toPng(el)
    setExportUrl(data)
    onExport?.(data)
  }

  const zoomPct = Math.round(viewT.scale * 100)

  return (
    <div style={pageStyle}>
      <div role="toolbar" aria-label="Drawing tools" id={toolbarId} style={toolWrap}>
        {TOOLS.map((tl) => (
          <button key={tl.key} type="button" aria-pressed={tool === tl.key ? 'true' : 'false'} onClick={() => { setTool(tl.key); setMode('draw') }} style={{ ...toolButton, background: tool === tl.key ? 'var(--ink)' : 'var(--paper)', color: tool === tl.key ? 'var(--paper)' : 'var(--ink)' }}>
            {tl.label}
          </button>
        ))}
        <button type="button" aria-pressed={mode === 'pan' ? 'true' : 'false'} onClick={() => setMode(mode === 'pan' ? 'draw' : 'pan')} style={{ ...toolButton, background: mode === 'pan' ? 'var(--ink)' : 'var(--paper)', color: mode === 'pan' ? 'var(--paper)' : 'var(--ink)' }}>
          Pan
        </button>
        <button type="button" title="Zoom in" onClick={zoomIn} style={toolButton}>Zoom In</button>
        <button type="button" title="Zoom out" onClick={zoomOut} style={toolButton}>Zoom Out</button>
        <button type="button" data-undo={stack.canUndo ? 'ready' : 'empty'} aria-disabled={stack.canUndo ? 'false' : 'true'} disabled={!stack.canUndo} onClick={doUndo} style={{ ...toolButton, opacity: stack.canUndo ? 1 : 0.4, cursor: stack.canUndo ? 'pointer' : 'default' }}>Undo</button>
        <button type="button" data-redo={stack.canRedo ? 'ready' : 'empty'} aria-disabled={stack.canRedo ? 'false' : 'true'} disabled={!stack.canRedo} onClick={doRedo} style={{ ...toolButton, opacity: stack.canRedo ? 1 : 0.4, cursor: stack.canRedo ? 'pointer' : 'default' }}>Redo</button>
        <button type="button" onClick={doExport} style={toolButton}>Export PNG</button>
      </div>
      <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
        <label style={{ fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)' }}>
          Layer
          <select
            aria-label="Layer"
            size={2}
            value={names[activeLayer] ?? ''}
            onChange={(e) => {
              const idx = names.indexOf(e.target.value)
              if (idx >= 0) setActiveLayer(idx)
            }}
            style={controlStyle}
          >
            {names.map((n, i) => (
              <option key={i} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span style={statusStyle}>Tool: {TOOLS.find((tl) => tl.key === tool)?.label ?? 'Brush'} · Zoom: {zoomPct}%</span>
      </div>
      <div style={canvasBox}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          role="img"
          aria-label="Drawing canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          style={{ display: 'block', cursor: mode === 'pan' ? 'grab' : 'crosshair', touchAction: 'none' }}
        />
      </div>
      {exportUrl && <div style={statusStyle}>Export: {exportUrl}</div>}
    </div>
  )
}
