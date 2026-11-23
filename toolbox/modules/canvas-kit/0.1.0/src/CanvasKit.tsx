// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/canvas-kit 0.1.0: snapshot of lacuna-components CanvasKit at d422a73 by sync-toolbox-components.py; a change gets a new version.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Toolbar, type ToolbarItem } from '@lacuna/toolbar'
import { RangeSlider } from '@lacuna/range-slider'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { type Point, type Stroke } from '@lacuna/use-pointer-draw'
import { useUndoStack } from '@lacuna/use-undo-stack'

type Tool = 'brush' | 'eraser' | 'shape'
type ShapeDraft = { a: Point; b: Point }

const font: CSSProperties = { fontFamily: 'var(--sans)', color: 'var(--ink)' }
const col8: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }
const heading: CSSProperties = { ...font, fontSize: 'calc(14px * var(--tf))', fontWeight: 600, margin: 0 }
const zoomBtn: CSSProperties = {
  ...font, fontSize: 'calc(14px * var(--tf))', background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(8px * var(--sf))',
  padding: 'calc(6px * var(--sf))', cursor: 'pointer',
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={col8}>
      <span style={heading}>{title}</span>
      {children}
    </div>
  )
}

const DEFAULT_SWATCHES = [
  { name: 'Ink', color: 'var(--ink)' }, { name: 'Accent', color: 'var(--accent)' },
  { name: 'Danger', color: 'var(--danger)' },
]
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4

export interface CanvasKitProps {
  /** Color swatches offered by the palette. Defaults to three token colors. */
  swatches?: Array<{ name: string; color: string }>
  /** Whether the layers panel is rendered. */
  showLayers?: boolean
  /** Whether the zoom controls are rendered. */
  showZoom?: boolean
  /** Brush size shown on first render (clamped to the slider range 1..100). */
  defaultBrushSize?: number
  /** Called after every committed stroke or shape. */
  onCommit?: (strokes: Stroke[]) => void
}

function cssVar(name: string): string {
  if (typeof document === 'undefined') return 'rgb(0,0,0)'
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || 'rgb(0,0,0)'
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, t: number): void {
  const points = stroke.points
  if (points.length === 0) return
  ctx.save()
  ctx.translate(0, 0)
  ctx.scale(t, t)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke.width
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  if (points.length === 1) {
    const p = points[0]
    if (p) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.beginPath()
    ctx.moveTo(points[0]!.x, points[0]!.y)
    for (let i = 1; i < points.length; i++) {
      const p = points[i]
      if (p) ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeDraft,
  color: string,
  width: number,
  t: number,
): void {
  ctx.save()
  ctx.scale(t, t)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = color
  ctx.fillRect(
    Math.min(shape.a.x, shape.b.x),
    Math.min(shape.a.y, shape.b.y),
    Math.max(1, Math.abs(shape.b.x - shape.a.x)),
    Math.max(1, Math.abs(shape.b.y - shape.a.y)),
  )
  ctx.restore()
}

export function CanvasKit({
  swatches,
  showLayers = false,
  showZoom = false,
  defaultBrushSize = 5,
  onCommit,
}: CanvasKitProps): ReactNode {
  const swatchList = swatches && swatches.length > 0 ? swatches : DEFAULT_SWATCHES
  const [swatchIndex, setSwatchIndex] = useState(0)
  const [tool, setTool] = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(() => Math.min(100, Math.max(1, defaultBrushSize)))
  const [zoom, setZoom] = useState(1)
  const [strokeCount, setStrokeCount] = useState(0)
  const undoStack = useUndoStack<Stroke[]>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const shapeRef = useRef<ShapeDraft | null>(null)
  const activeStrokeRef = useRef<Stroke | null>(null)
  const toolRef = useRef<Tool>(tool)
  const colorRef = useRef('var(--ink)')
  const brushRef = useRef(brushSize)

  useEffect(() => {
    toolRef.current = tool
    colorRef.current = swatchList[swatchIndex]?.color ?? 'var(--ink)'
    brushRef.current = brushSize
  }, [tool, swatchList, swatchIndex, brushSize])

  const paint = useCallback((): void => {
    const el = canvasRef.current
    const ctx = el ? el.getContext('2d') : null
    if (!el || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = cssVar('--paper-deep')
    ctx.fillRect(0, 0, el.width, el.height)
    ctx.restore()
    for (const stroke of undoStack.value) drawStroke(ctx, stroke, zoom)
    const active = activeStrokeRef.current
    if (active) drawStroke(ctx, active, zoom)
    const shape = shapeRef.current
    if (shape) drawShape(ctx, shape, colorRef.current, brushRef.current, zoom)
  }, [zoom, undoStack.value])

  useEffect(() => {
    paint()
  }, [paint])

  const commitStroke = useCallback(
    (stroke: Stroke) => {
      activeStrokeRef.current = null
      shapeRef.current = null
      undoStack.set((prev) => [...prev, stroke])
      setStrokeCount((n) => n + 1)
      onCommit?.([...undoStack.value, stroke])
    },
    [onCommit, undoStack],
  )

  const toLocal = useCallback(
    (clientX: number, clientY: number): Point => {
      const el = canvasRef.current
      const rect = el ? el.getBoundingClientRect() : null
      if (!rect) return { x: clientX, y: clientY, pressure: 1 }
      return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom, pressure: 1 }
    },
    [zoom],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const p = toLocal(e.clientX, e.clientY)
      if (toolRef.current === 'shape') {
        shapeRef.current = { a: p, b: p }
      } else {
        activeStrokeRef.current = {
          points: [p],
          color: toolRef.current === 'eraser' ? cssVar('--paper-deep') : colorRef.current,
          width: toolRef.current === 'eraser' ? Math.max(brushRef.current * 3, 12) : brushRef.current,
        }
      }
      paint()
    },
    [paint, toLocal],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const p = toLocal(e.clientX, e.clientY)
      if (toolRef.current === 'shape') {
        const shape = shapeRef.current
        if (!shape) return
        shape.b = p
      } else {
        const stroke = activeStrokeRef.current
        if (stroke) stroke.points.push(p)
      }
      paint()
    },
    [paint, toLocal],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      void e
      if (toolRef.current === 'shape') {
        const shape = shapeRef.current
        shapeRef.current = null
        if (!shape) return
        const w = Math.max(1, Math.abs(shape.b.x - shape.a.x))
        const h = Math.max(1, Math.abs(shape.b.y - shape.a.y))
        commitStroke({
          points: [
            shape.a,
            { x: shape.a.x + w, y: shape.a.y, pressure: 1 },
            { x: shape.a.x + w, y: shape.a.y + h, pressure: 1 },
            { x: shape.a.x, y: shape.a.y + h, pressure: 1 },
            shape.a,
          ],
          color: colorRef.current,
          width: 2,
        })
        return
      }
      const stroke = activeStrokeRef.current
      if (stroke) commitStroke(stroke)
    },
    [commitStroke],
  )

  const onPointerLeave = useCallback(() => {
    const stroke = activeStrokeRef.current
    activeStrokeRef.current = null
    shapeRef.current = null
    if (stroke) commitStroke(stroke)
    paint()
  }, [commitStroke, paint])

  const undo = useCallback(() => {
    undoStack.undo()
    setStrokeCount((n) => Math.max(0, n - 1))
  }, [undoStack])

  const toolbarItems: ToolbarItem[] = [
    { id: 'brush', label: 'Brush', type: 'toggle', active: tool === 'brush', action: () => setTool('brush') },
    { id: 'eraser', label: 'Eraser', type: 'toggle', active: tool === 'eraser', action: () => setTool('eraser') },
    { id: 'shape', label: 'Shape', type: 'toggle', active: tool === 'shape', action: () => setTool('shape') },
    { id: 'undo', label: 'Undo', type: 'button', disabled: !undoStack.canUndo, action: undo },
  ]

  const exportOptions: ExportOption[] = [
    {
      id: 'png',
      label: 'PNG',
      mimeType: 'image/png',
      extension: 'png',
      getData: () => {
        const el = canvasRef.current
        return el ? el.toDataURL('image/png') : ''
      },
    },
  ]

  const onSwatchKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const count = swatchList.length
    if (count === 0) return
    let next: number | null = null
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (swatchIndex + 1) % count
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (swatchIndex - 1 + count) % count
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }
    event.preventDefault()
    setSwatchIndex(next)
  }

  const zoomIn = (): void => setZoom((z) => Math.min(ZOOM_MAX, z + 0.25))
  const zoomOut = (): void => setZoom((z) => Math.max(ZOOM_MIN, z - 0.25))

  const swatchStyle = (selected: boolean): CSSProperties => ({
    width: 'calc(28px * var(--sf))',
    height: 'calc(28px * var(--sf))',
    padding: 0,
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: 'calc(6px * var(--sf))',
    cursor: 'pointer',
    outline: selected ? 'calc(3px * var(--sf)) solid var(--ink)' : 'none',
    outlineOffset: 'calc(1px * var(--sf))',
  })

  return (
    <section
      role="region"
      aria-label="Drawing Canvas"
      style={{
        ...font,
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(12px * var(--sf))',
        padding: 'calc(12px * var(--sf))',
        border: 'calc(1px * var(--sf)) solid var(--hair)',
        borderRadius: 'calc(8px * var(--sf))',
        background: 'var(--paper)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'calc(12px * var(--sf))',
          flexWrap: 'wrap',
        }}
      >
        <Toolbar items={toolbarItems} ariaLabel="Drawing Tools" />
        <ExportMenu options={exportOptions} fileName="canvas" />
      </div>

      <canvas
        ref={canvasRef}
        width={480}
        height={320}
        role="img"
        aria-label="Drawing surface"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          touchAction: 'none',
          cursor: 'crosshair',
          background: 'var(--paper-deep)',
          border: 'calc(1px * var(--sf)) solid var(--hair)',
          borderRadius: 'calc(8px * var(--sf))',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      />

      <Section title="Color">
        <div
          role="group"
          aria-label="Color palette"
          style={{ display: 'flex', gap: 'calc(6px * var(--sf))', flexWrap: 'wrap' }}
          onKeyDown={onSwatchKeyDown}
        >
          {swatchList.map((swatch, index) => {
            const selected = index === swatchIndex
            return (
              <button
                key={swatch.name}
                type="button"
                aria-label={`Color #${index + 1}`}
                aria-pressed={selected ? 'true' : 'false'}
                tabIndex={selected ? 0 : -1}
                onClick={() => setSwatchIndex(index)}
                style={{ ...swatchStyle(selected), background: swatch.color }}
              />
            )
          })}
        </div>
      </Section>

      <div style={col8}>
        <RangeSlider
          label="Brush size"
          value={brushSize}
          onChange={setBrushSize}
          min={1}
          max={100}
          step={1}
        />
      </div>

      {showLayers && (
        <Section title="Layers">
          <p style={{ ...font, margin: 0, fontSize: 'calc(14px * var(--tf))' }}>
            {strokeCount} stroke{strokeCount === 1 ? '' : 's'} on the canvas.
          </p>
        </Section>
      )}

      {showZoom && (
        <Section title="Zoom">
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
            <button type="button" aria-label="Zoom in" onClick={zoomIn} style={zoomBtn}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={zoomOut} style={zoomBtn}>
              -
            </button>
            <span style={{ ...font, fontFamily: 'var(--mono)', fontSize: 'calc(14px * var(--tf))' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </Section>
      )}
    </section>
  )
}
