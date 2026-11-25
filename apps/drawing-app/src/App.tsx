// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  AppShell,
  Button,
  Card,
  Divider,
  SectionLabel,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { RangeSlider } from '@lacuna/range-slider'
import { hexToRgb, rgbToHex } from '@lacuna/color-math'
import { saveBlob } from '@lacuna/file-save-open'
import { mockStore } from './host/mock'
import type { Layer, Point, Stroke } from './host'
import { ERASER, PNG } from './colors'
import './App.css'

const CANVAS_W = 480
const CANVAS_H = 360
const ZOOM_STEP = 0.1

type Tool = 'brush' | 'eraser' | 'rectangle'

function normalizeHex(input: string): string | null {
  const trimmed = input.trim()
  const noHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (!/^[0-9a-fA-F]{3}$/.test(noHash) && !/^[0-9a-fA-F]{6}$/.test(noHash)) return null
  try {
    return rgbToHex(hexToRgb(`#${noHash}`))
  } catch {
    return null
  }
}

function layerNameFor(index: number): string {
  return `Layer ${index + 1}`
}

function tracePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  const first = points[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i]
    if (p) ctx.lineTo(p.x, p.y)
  }
}

function paintLayer(ctx: CanvasRenderingContext2D, layer: Layer): void {
  for (const stroke of layer.strokes) {
    const points = stroke.points
    if (points.length === 0) continue
    ctx.save()
    if (stroke.kind === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = ERASER
      ctx.fillStyle = ERASER
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = stroke.color
      ctx.fillStyle = stroke.color
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = stroke.size
    if (stroke.kind === 'rectangle') {
      const a = points[0]
      const b = points[points.length - 1]
      if (a && b) {
        ctx.fillRect(
          Math.min(a.x, b.x),
          Math.min(a.y, b.y),
          Math.abs(b.x - a.x),
          Math.abs(b.y - a.y),
        )
      }
    } else if (points.length === 1) {
      const p = points[0]
      if (p) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      tracePath(ctx, points)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function paintLive(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  size: number,
  kind: Tool,
): void {
  ctx.save()
  if (kind === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = ERASER
    ctx.fillStyle = ERASER
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
    ctx.fillStyle = color
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size
  if (kind === 'rectangle') {
    const a = points[0]
    const b = points[points.length - 1]
    if (a && b) {
      ctx.fillRect(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.abs(b.x - a.x),
        Math.abs(b.y - a.y),
      )
    }
  } else if (points.length === 1) {
    const p = points[0]
    if (p) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    tracePath(ctx, points)
    ctx.stroke()
  }
  ctx.restore()
}

function redraw(
  canvas: HTMLCanvasElement | null,
  layer: Layer | undefined,
  live: { points: Point[]; color: string; size: number; kind: Tool } | null,
  zoom: number,
): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(zoom, zoom)
  if (layer) paintLayer(ctx, layer)
  if (live) paintLive(ctx, live.points, live.color, live.size, live.kind)
  ctx.restore()
}

export function App() {
  const initial = useMemo(() => mockStore.read(), [])
  const [layers, setLayers] = useState<Layer[]>(initial.layers)
  const [selected, setSelected] = useState<string | null>(initial.selected ?? initial.layers[0]?.name ?? null)
  const [hex, setHex] = useState<string>(initial.hex)
  const [draft, setDraft] = useState<string>(initial.hex)
  const [tool, setTool] = useState<Tool>('brush')
  const [size, setSize] = useState(6)
  const [eraserSize, setEraserSize] = useState(40)
  const [zoom, setZoom] = useState(1)
  const [history, setHistory] = useState<Layer[][]>([])
  const [redos, setRedos] = useState<Layer[][]>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef<{ name: string; points: Point[] } | null>(null)

  const selectedLayer = layers.find((l) => l.name === selected) ?? layers[0]
  const zoomPct = Math.round(zoom * 100)

  const hexError = useMemo(() => {
    if (draft.trim() === '') return null
    return normalizeHex(draft) === null ? 'Use six hex digits, like ff0000' : null
  }, [draft])

  useEffect(() => {
    const layer = layers.find((l) => l.name === selected) ?? layers[0]
    redraw(canvasRef.current, layer, null, zoom)
  }, [layers, selected, zoom])

  useEffect(() => {
    mockStore.write({ layers, selected: selected ?? null, hex })
  }, [layers, selected, hex])

  function commitLayers(next: Layer[]): void {
    setHistory((h) => [...h, layers])
    setRedos([])
    setLayers(next)
  }

  function toPoint(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    const x = event.clientX - (rect?.left ?? 0)
    const y = event.clientY - (rect?.top ?? 0)
    return {
      x: canvas ? (x * (canvas.width / canvas.clientWidth)) / zoom : x / zoom,
      y: canvas ? (y * (canvas.height / canvas.clientHeight)) / zoom : y / zoom,
    }
  }

  const activeSize = tool === 'eraser' ? eraserSize : size

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (!selected) return
    const p = toPoint(event)
    drawingRef.current = { name: selected, points: tool === 'rectangle' ? [p, p] : [p] }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const drawing = drawingRef.current
    if (!drawing) return
    const p = toPoint(event)
    const points =
      tool === 'rectangle' ? [drawing.points[0] ?? p, p] : [...drawing.points, p]
    drawingRef.current = { name: drawing.name, points }
    const layer = layers.find((l) => l.name === drawing.name)
    if (tool === 'eraser') {
      // Preview: just repaint without any live overlay
      redraw(canvasRef.current, layer, null, zoom)
      return
    }
    redraw(canvasRef.current, layer, { points, color: hex, size: activeSize, kind: tool }, zoom)
  }

  function onPointerUp(): void {
    const drawing = drawingRef.current
    drawingRef.current = null
    if (!drawing || drawing.points.length === 0) return

    if (tool === 'eraser') {
      const p = drawing.points[0]!
      const layer = layers.find((l) => l.name === drawing.name)
      if (!layer) return
      const hitRadius = eraserSize / 2
      const hitIndex = layer.strokes.findIndex((s) =>
        s.points.some(
          (pt) => Math.hypot(pt.x - p.x, pt.y - p.y) <= hitRadius,
        ),
      )
      if (hitIndex < 0) return
      const next = layers.map((l) =>
        l.name === layer.name
          ? { ...l, strokes: l.strokes.filter((_, i) => i !== hitIndex) }
          : l,
      )
      commitLayers(next)
      return
    }

    const stroke: Stroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: tool,
      color: hex,
      size: activeSize,
      points: drawing.points,
    }
    const next = layers.map((l) =>
      l.name === drawing.name ? { ...l, strokes: [...l.strokes, stroke] } : l,
    )
    commitLayers(next)
  }

  function addLayer(): void {
    const name = layerNameFor(layers.length)
    commitLayers([...layers, { name, strokes: [] }])
    setSelected(name)
  }

  function deleteLayer(): void {
    if (!selected || layers.length === 1) return
    const next = layers.filter((l) => l.name !== selected)
    commitLayers(next)
    setSelected(next[0]?.name ?? null)
  }

  function undo(): void {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory((h) => h.slice(0, -1))
    setRedos((r) => [...r, layers])
    setLayers(prev)
    if (!prev.some((l) => l.name === selected)) setSelected(prev[0]?.name ?? null)
  }

  function redo(): void {
    const next = redos[redos.length - 1]
    if (!next) return
    setRedos((r) => r.slice(0, -1))
    setHistory((h) => [...h, layers])
    setLayers(next)
    if (!next.some((l) => l.name === selected)) setSelected(next[0]?.name ?? null)
  }

  function exportPng(): void {
    const source = canvasRef.current
    if (!source) return
    const out = document.createElement('canvas')
    out.width = source.width
    out.height = source.height
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = PNG.paper
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(source, 0, 0)
    void out.toBlob((blob) => {
      if (blob) saveBlob(blob, { filename: 'drawing.png', mimeType: 'image/png' })
    }, 'image/png')
  }

  function onHexChange(raw: string): void {
    setDraft(raw)
    const normalized = normalizeHex(raw)
    if (normalized) setHex(normalized)
  }

  function zoomBy(delta: number): void {
    setZoom((z) => Math.min(5, Math.max(0.1, Math.round((z + delta) * 100) / 100)))
  }

  return (
    <AppShell name="Digital Drawing Canvas" icon="paint" hue="rust" category="Drawing">
      <Card mono="Canvas" title="Drawing" actions={<Tag>{zoomPct}%</Tag>}>
        <div className="dp-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="dp-canvas"
            role="img"
            aria-label="Drawing canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </Card>
      <Card mono="Tools" title="Toolbox">
        <div className="dp-label-accent"><SectionLabel accent>Tool</SectionLabel></div>
        <div role="toolbar" aria-label="Drawing tools">
          <div className="dp-btn-row">
            <Button kind={tool === 'brush' ? 'primary' : 'secondary'} onClick={() => setTool('brush')}>
              Brush
            </Button>
            <Button kind={tool === 'eraser' ? 'primary' : 'secondary'} onClick={() => setTool('eraser')}>
              Eraser
            </Button>
            <Button kind={tool === 'rectangle' ? 'primary' : 'secondary'} onClick={() => setTool('rectangle')}>
              Rectangle
            </Button>
          </div>
        </div>
        <Divider />
        <RangeSlider
          label="Brush size"
          min={1}
          max={40}
          step={1}
          value={size}
          onChange={(v: number) => setSize(v)}
          format={(v: number) => `${v}px`}
        />
        <RangeSlider
          label="Eraser size"
          min={4}
          max={40}
          step={1}
          value={eraserSize}
          onChange={(v: number) => setEraserSize(v)}
          format={(v: number) => `${v}px`}
        />
        <Divider />
        <SectionLabel>Color</SectionLabel>
        <div className="dp-color-row">
          <TextInput
            label="Hex"
            value={draft}
            onChange={onHexChange}
            error={hexError}
          />
          <span className="dp-swatch" style={{ backgroundColor: hex }}>
            {hex}
          </span>
        </div>
      </Card>
      <Card
        mono="Layers"
        title="Layers"
        actions={
          <div className="dp-btn-row">
            <Button onClick={addLayer}>Add Layer</Button>
            <Button kind="danger" onClick={deleteLayer} disabled={layers.length === 1 || selected === null}>
              Delete Layer
            </Button>
          </div>
        }
      >
        <ul className="dp-list lk-list" aria-label="Layers">
          {layers.map((layer) => {
            const isSel = layer.name === selected
            return (
              <li
                key={layer.name}
                className={isSel ? 'dp-row lk-row hot' : 'dp-row lk-row'}
                data-selected={isSel ? 'true' : 'false'}
              >
                <button type="button" className="lk-row-text" onClick={() => setSelected(layer.name)}>
                  <span className="lk-row-title">{layer.name}</span>
                  <span className="lk-row-meta">
                    {layer.strokes.length} stroke{layer.strokes.length === 1 ? '' : 's'}
                  </span>
                </button>
                {isSel ? <span className="dp-tag-active"><Tag accent>active</Tag></span> : null}
              </li>
            )
          })}
        </ul>
      </Card>
      <Card mono="History" title="History">
        <div className="dp-btn-row">
          <Button kind="primary" onClick={undo} disabled={history.length === 0}>
            Undo
          </Button>
          <Button onClick={redo} disabled={redos.length === 0}>
            Redo
          </Button>
        </div>
        <Divider />
        <SectionLabel>Export</SectionLabel>
        <div className="dp-btn-row">
          <Button kind="primary" onClick={exportPng}>
            Export PNG
          </Button>
        </div>
        <Divider />
        <SectionLabel>Zoom</SectionLabel>
        <div className="dp-btn-row">
          <Button onClick={() => zoomBy(ZOOM_STEP)}>Zoom In</Button>
          <Button onClick={() => zoomBy(-ZOOM_STEP)}>Zoom Out</Button>
        </div>
      </Card>
    </AppShell>
  )
}
