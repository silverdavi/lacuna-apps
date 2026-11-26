// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, List, PrimaryButton, Rail, Row, Select, Stack, TextInput, Actions } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { layerName, nextLayerId, useBoard, type Stroke } from './host'
import { drawAll } from './draw'
import { colorLabel, SIZES, WHITE } from './colors'
import './whiteboard.css'

const W = 880
const H = 480

const COLOR_OPTIONS = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'black', label: 'Black' },
  { value: 'paper', label: 'Paper' },
]

export function App() {
  const { value, set } = useBoard()
  const { strokes, layers, activeLayer, tool, color, size, zoom } = value
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [draft, setDraft] = useState<Stroke | null>(null)
  const [status, setStatus] = useState('Ready to draw')
  const [toast, setToast] = useState<string | null>(null)
  const [zoomText, setZoomText] = useState(String(zoom))
  const [zoomError, setZoomError] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<typeof value[]>([])
  const [redoStack, setRedoStack] = useState<typeof value[]>([])
  const clipboard = useClipboard({ timeoutMs: 1500 })

  const visibleStrokes = useMemo(
    () => strokes.filter((s) => layers.find((l) => l.id === s.layer)?.visible !== false),
    [strokes, layers],
  )

  useEffect(() => {
    if (strokes.length > 0) {
      setStatus(`Restored: ${strokes.length} stroke${strokes.length === 1 ? '' : 's'}`)
    }
  }, [])

  useEffect(() => {
    const input = document.querySelector('input[placeholder="100"]') as HTMLInputElement | null
    if (!input) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        applyZoom()
      }
    }
    input.addEventListener('keydown', onKey)
    return () => input.removeEventListener('keydown', onKey)
  }, [zoomText, zoom])

  function patch(next: Partial<typeof value>, commit = false) {
    if (commit) {
      setUndoStack((u) => [...u, value])
      setRedoStack([])
    }
    set((v) => ({ ...v, ...next }))
  }

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    const all = draft ? [...visibleStrokes, draft] : visibleStrokes
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.scale(zoom / 100, zoom / 100)
    ctx.translate(-W / 2, -H / 2)
    drawAll(ctx, W, H, all)
    ctx.restore()
  }, [visibleStrokes, draft, zoom])

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scale = zoom / 100
    return {
      x: (e.clientX - rect.left) / scale + (W * (1 - scale)) / 2,
      y: (e.clientY - rect.top) / scale + (H * (1 - scale)) / 2,
    }
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch' && !e.isPrimary) return
    drawingRef.current = true
    const p = canvasPoint(e)
    setDraft({ id: `${Date.now()}`, layer: activeLayer, tool, color, size, points: [p] })
  }

  function moveStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !draft) return
    const p = canvasPoint(e)
    setDraft({ ...draft, points: [...draft.points, p] })
  }

  function endStroke() {
    if (!drawingRef.current || !draft) return
    drawingRef.current = false
    const added = draft
    setDraft(null)
    patch({ strokes: [...strokes, added] }, true)
    const label = added.tool === 'eraser' ? 'Eraser' : colorLabel(added.color)
    setStatus(`Stroke added: ${label}, ${added.size}p` + 'x')
  }

  function undo() {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack([value, ...redoStack])
    set(prev)
    setStatus('Undo: stroke removed')
  }

  function redo() {
    const next = redoStack[0]
    if (!next) return
    setRedoStack(redoStack.slice(1))
    setUndoStack([...undoStack, value])
    set(next)
    setStatus('Redo: stroke restored')
  }

  function addLayer() {
    const id = nextLayerId(layers)
    patch({ layers: [...layers, { id, name: layerName(id), visible: true }], activeLayer: id }, true)
  }

  function deleteLayer(id: number) {
    patch({
      layers: layers.filter((l) => l.id !== id),
      activeLayer: activeLayer === id ? 1 : activeLayer,
      strokes: strokes.filter((s) => s.layer !== id),
    }, true)
  }

  function toggleLayer(id: number) {
    patch({ layers: layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) }, true)
  }

  function applyZoom() {
    const n = Number(zoomText)
    if (Number.isNaN(n) || n < 25 || n > 400) {
      setZoomError('Enter a zoom between 25 and 400')
      return
    }
    setZoomError(null)
    const rounded = Math.round(n)
    patch({ zoom: rounded })
    setZoomText(String(rounded))
  }

  function renderPng(width: number, height: number) {
    const out = document.createElement('canvas')
    out.width = width
    out.height = height
    const ctx = out.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = WHITE
    ctx.fillRect(0, 0, width, height)
    drawAll(ctx, width, height, visibleStrokes)
    return out
  }

  async function exportPng() {
    const out = renderPng(W, H)
    if (!out) {
      setStatus('Export failed: no canvas context')
      return
    }
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'))
    if (!blob) {
      setStatus('Export failed: could not encode the image')
      return
    }
    saveBlob(blob, { filename: 'whiteboard.png', mimeType: 'image/png' })
    setToast('PNG exported successfully')
    window.setTimeout(() => setToast(null), 2400)
  }

  async function copyPng() {
    const out = renderPng(W, H)
    if (!out) return
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'))
    if (blob) await clipboard.copy(blob)
  }

  function clearCanvas() {
    patch({ strokes: [] }, true)
    setToast('Canvas cleared')
    setStatus('Ready to draw')
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <AppShell
      name="Whiteboard"
      icon="whiteboard"
      hue="rust"
      category="Productivity"
      meta={`${strokes.length} strokes`}
      status={status}
      side={
        <Rail
          title="Canvas"
          note={`${visibleStrokes.length} visible stroke${visibleStrokes.length === 1 ? '' : 's'}`}
          chips={['Press and drag to draw']}
        >
          <div className="lb-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="lb-canvas"
              width={W}
              height={H}
              role="img"
              aria-label="Whiteboard canvas"
              onPointerDown={startStroke}
              onPointerMove={moveStroke}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
            />
          </div>
          <div className="lb-zoom-indicator" aria-label={`Zoom ${zoom}%`}>{zoom}%</div>
          <KpiRow>
            <Kpi value={`${visibleStrokes.length}`} label="Visible" />
            <Kpi value={`${strokes.length}`} label="Total" />
          </KpiRow>
        </Rail>
      }
    >
      <Stack>
        <Card mono="Tools" title="Brush and eraser">
          <FormGrid>
            <Select
              label="Color"
              value={color}
              onChange={(v) => patch({ color: v })}
              options={COLOR_OPTIONS}
            />
            <Select label="Size" value={String(size)} onChange={(v) => patch({ size: Number(v) })} options={SIZES} />
            <TextInput
              label="Zoom level"
              value={zoomText}
              onChange={(v) => setZoomText(v)}
              inputMode="numeric"
              type="text"
              error={zoomError}
              placeholder="100"
              hint="Enter a value between 25 and 400, press Enter to apply"
            />
          </FormGrid>
          <div className="lb-actions-row">
            <Actions>
              <PrimaryButton ariaLabel="Brush tool" onClick={() => { patch({ tool: 'brush' }); setStatus('Brush active') }}>Brush</PrimaryButton>
              <Button kind="secondary" onClick={() => { patch({ tool: 'eraser' }); setStatus('Eraser active') }}>Eraser</Button>
              <Button kind="secondary" onClick={undo} disabled={undoStack.length === 0}>Undo</Button>
              <Button kind="secondary" onClick={redo} disabled={redoStack.length === 0}>Redo</Button>
              <Button kind="secondary" onClick={applyZoom}>Set zoom</Button>
            </Actions>
            <Actions>
              <PrimaryButton onClick={() => void exportPng()}>Export PNG</PrimaryButton>
              <Button kind="secondary" onClick={() => void copyPng()}>
                {clipboard.copied ? 'Copied' : 'Copy PNG'}
              </Button>
              <Button kind="danger" onClick={clearCanvas}>Clear canvas</Button>
            </Actions>
          </div>
        </Card>

        <Card mono={`${layers.length} layers`} title="Layers">
          {layers.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No layers yet"
              detail="Add the first layer to start sketching."
              actionLabel="Add layer"
              onAction={addLayer}
            />
          ) : (
            <List label="Layers">
              {layers.map((layer) => (
                <Row
                  key={layer.id}
                  title={layer.name}
                  meta={layer.visible ? 'visible' : 'hidden'}
                  hot={layer.id === activeLayer}
                  action={
                    <Actions>
                      <Button
                        kind="ghost"
                        onClick={() => patch({ activeLayer: layer.id })}
                      >
                        {layer.id === activeLayer ? 'Active' : 'Select'}
                      </Button>
                      <Button kind="ghost" onClick={() => toggleLayer(layer.id)}>
                        {layer.visible ? 'Hide' : 'Show'}
                      </Button>
                      <Button kind="ghost" onClick={() => deleteLayer(layer.id)}>
                        Delete {layer.name}
                      </Button>
                    </Actions>
                  }
                />
              ))}
            </List>
          )}
          <Actions>
            <Button kind="secondary" onClick={addLayer}>Add layer</Button>
          </Actions>
        </Card>

        {strokes.length === 0 && (
          <Card mono="Empty" title="Blank canvas">
            <EmptyState
              mono="Ready"
              title="Blank canvas"
              detail="Pick a color, then press on the canvas to make a stroke."
              actionLabel="Pick a color"
              onAction={() => {}}
            />
          </Card>
        )}

        {toast && (
          <div className="lb-toast" role="status">{toast}</div>
        )}
      </Stack>
    </AppShell>
  )
}
