// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useEffect, useRef, useState } from 'react'
import { saveBlob } from '@lacuna/file-save-open'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  List,
  Row,
  Stack,
} from '@lacuna/ui'
import { mockStore } from './host/mock'
import type { Layer, Stroke } from './host'
import { PNG, SWATCHES } from './colors'
import './dp.css'

const CANVAS_W = 800
const CANVAS_H = 500
const MIN_SIZE = 1
const MAX_SIZE = 40
const DEFAULT_SIZE = 3

function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer): void {
  for (const stroke of layer.strokes) {
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    stroke.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    if (stroke.points.length === 1) {
      const p = stroke.points[0]
      ctx.lineTo(p.x + 0.01, p.y + 0.01)
    }
    ctx.stroke()
  }
}

function exportPng(layers: Layer[]): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('no ctx'))
  ctx.fillStyle = PNG.paper
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  for (const layer of layers) drawLayer(ctx, layer)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG export failed'))
    }, 'image/png')
  })
}

function pointFromEvent(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
    y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
  }
}

export function App() {
  const initial = mockStore.read()
  const [layers, setLayers] = useState<Layer[]>(initial.layers)
  const [selected, setSelected] = useState<string | null>(initial.selected)
  const [tab, setTab] = useState<'Draw' | 'Layers'>('Draw')
  const [tool, setTool] = useState<'Brush'>('Brush')
  const [color, setColor] = useState<string>(SWATCHES[0].color)
  const [size, setSize] = useState<number>(DEFAULT_SIZE)
  const [exporting, setExporting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  const activeLayer = layers.find((l) => l.name === selected) ?? null
  const totalStrokes = layers.reduce((n, l) => n + l.strokes.length, 0)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    if (activeLayer) drawLayer(ctx, activeLayer)
  }, [activeLayer])

  useEffect(() => {
    redraw()
  }, [redraw, layers])

  useEffect(() => {
    mockStore.write({ layers, selected })
  }, [layers, selected])

  const strokeLayerRef = useRef<string | null>(null)

  function addPoint(p: { x: number; y: number }) {
    if (!strokeLayerRef.current) return
    const layerName = strokeLayerRef.current
    const stroke: Stroke = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      color,
      size,
      points: [p],
    }
    setLayers((prev) =>
      prev.map((l) =>
        l.name === layerName ? { ...l, strokes: [...l.strokes, stroke] } : l,
      ),
    )
  }

  function appendPoint(p: { x: number; y: number }) {
    if (!strokeLayerRef.current) return
    const layerName = strokeLayerRef.current
    setLayers((prev) =>
      prev.map((l) => {
        if (l.name !== layerName) return l
        const strokes = [...l.strokes]
        const last = strokes[strokes.length - 1]
        if (last) strokes[strokes.length - 1] = { ...last, points: [...last.points, p] }
        return { ...l, strokes }
      }),
    )
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    strokeLayerRef.current = ensureLayer().name
    addPoint(pointFromEvent(e.currentTarget, e))
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    appendPoint(pointFromEvent(e.currentTarget, e))
  }

  function onPointerUp() {
    drawingRef.current = false
    strokeLayerRef.current = null
  }

  function addLayer() {
    const name = `Layer ${layers.length + 1}`
    const next = [...layers, { name, strokes: [] }]
    const keep = selected && next.some((l) => l.name === selected) ? selected : next[0].name
    setLayers(next)
    setSelected(keep)
  }

  function ensureLayer(): Layer {
    if (activeLayer) return activeLayer
    const name = `Layer ${layers.length + 1}`
    const next = [...layers, { name, strokes: [] }]
    setLayers(next)
    setSelected(name)
    return next[next.length - 1]
  }

  function deleteLayer() {
    if (!selected) return
    const next = layers.filter((l) => l.name !== selected)
    const nextSelected = next.length > 0 ? next[next.length - 1].name : null
    setLayers(next)
    setSelected(nextSelected)
  }

  function clearCanvas() {
    if (!activeLayer) return
    const next = layers.map((l) =>
      l.name === activeLayer.name ? { ...l, strokes: [] } : l,
    )
    setLayers(next)
  }

  function doExport() {
    setExporting(true)
    exportPng(layers)
      .then((blob) => {
        saveBlob(blob, { filename: 'sketch.png', mimeType: 'image/png' })
      })
      .catch(() => undefined)
      .finally(() => setExporting(false))
  }

  return (
    <AppShell
      name="Sketch Pad"
      icon="design"
      hue="blue"
      category="Productivity"
      meta={`${layers.length} layers · ${totalStrokes} strokes`}
    >
      <Stack lg>
        <div role="tablist" aria-label="Sketch views" className="dp-tablist">
          <button
            type="button"
            role="tab"
            id="tab-draw"
            aria-selected={tab === 'Draw'}
            aria-controls="panel-draw"
            className={`dp-tab${tab === 'Draw' ? ' active' : ''}`}
            onClick={() => setTab('Draw')}
          >
            Draw
          </button>
          <button
            type="button"
            role="tab"
            id="tab-layers"
            aria-selected={tab === 'Layers'}
            aria-controls="panel-layers"
            className={`dp-tab${tab === 'Layers' ? ' active' : ''}`}
            onClick={() => setTab('Layers')}
          >
            Layers
          </button>
        </div>

        <Card mono={`${layers.length} layers`} title="Layers">
          <div
            style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap', marginBottom: layers.length > 0 ? 'calc(12px * var(--sf))' : 0 }}
          >
            <Button kind="primary" onClick={addLayer}>
              New Layer
            </Button>
            <Button kind="danger" onClick={deleteLayer} disabled={!selected}>
              Delete Layer
            </Button>
          </div>
          {layers.length === 0 ? (
            <EmptyState
              title="No layers"
              detail="Add the first layer to start sketching."
              actionLabel="Add a layer"
              onAction={addLayer}
            />
          ) : (
            <List>
              {layers.map((l) => (
                <Row
                  key={l.name}
                  title={l.name}
                  meta={`${l.strokes.length} strokes`}
                  hot={selected === l.name}
                  onClick={() => setSelected(l.name)}
                />
              ))}
            </List>
          )}
        </Card>

        <Card mono="Tool" title="Sketch tools">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'calc(12px * var(--sf))' }}>
            <Button
              kind={tool === 'Brush' ? 'primary' : 'secondary'}
              onClick={() => setTool('Brush')}
              title="Select the brush tool"
            >
              Brush
            </Button>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'calc(12px * var(--sf))', alignItems: 'end' }}>
              <div>
                <label
                  htmlFor="brush-color"
                  style={{ display: 'block', fontSize: 'calc(13px * var(--tf))', marginBottom: 'calc(4px * var(--sf))' }}
                >
                  Color
                </label>
                <select
                  id="brush-color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    height: 'calc(32px * var(--sf))',
                    padding: '0 calc(8px * var(--sf))',
                    border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                    borderRadius: 'calc(8px * var(--sf))',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 'calc(13px * var(--tf))',
                  }}
                >
                  {SWATCHES.map((swatch) => (
                    <option key={swatch.label} value={swatch.color}>
                      {swatch.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 'calc(13px * var(--tf))', marginBottom: 'calc(4px * var(--sf))', color: 'var(--ink-80)' }}>
                  Size
                </div>
                <input
                  id="brush-size"
                  type="range"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  step={1}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  aria-label="Brush size"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </Card>

        <div
          role="tabpanel"
          id={tab === 'Draw' ? 'panel-draw' : 'panel-layers'}
          aria-labelledby={tab === 'Draw' ? 'tab-draw' : 'tab-layers'}
        >
          <Card
            mono="Drawing surface"
            title="Canvas"
            style={{ display: tab === 'Draw' ? undefined : 'none' }}
          >
            <div className="dp-canvas-wrap">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="dp-canvas"
                role="img"
                aria-label="Sketch drawing surface"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <div className="dp-canvas-hint" aria-hidden="true">
                Infinite Canvas
              </div>
            </div>
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <div
                style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}
              >
                <Button kind="ghost" onClick={clearCanvas} disabled={!activeLayer}>
                  Clear Canvas
                </Button>
                <Button kind="ink" onClick={doExport} disabled={exporting}>
                  Export PNG
                </Button>
              </div>
            </div>
          </Card>
          {tab === 'Layers' ? (
            <Card mono="Layers" title="Layers">
              <div style={{ fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)' }}>
                Select a layer to make it the drawing target.
              </div>
            </Card>
          ) : null}
        </div>
      </Stack>
    </AppShell>
  )
}
