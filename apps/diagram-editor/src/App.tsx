// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, List, Rail, Row, TextInput } from '@lacuna/ui'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { SHAPE_COLORS, SWATCHES } from './colors'
import { shapesStore, type Shape } from './host'

type Tool = 'select' | 'rectangle' | 'ellipse'

const CANVAS_W = 960
const CANVAS_H = 520

function shapeName(kind: Shape['kind'], ordinal: number, label: string): string {
  const text = label.trim()
  if (text !== '') return text
  return kind === 'rectangle' ? `Rectangle ${ordinal}` : `Ellipse ${ordinal}`
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  ordinals: Map<string, number>,
  selectedId: string | null,
  scale: number,
) {
  const w = CANVAS_W * scale
  const h = CANVAS_H * scale
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.scale(scale, scale)
  ctx.lineWidth = 2
  ctx.font = '1em var(--serif)'
  for (const shape of shapes) {
    ctx.beginPath()
    if (shape.kind === 'rectangle') {
      ctx.rect(shape.x, shape.y, shape.w, shape.h)
    } else {
      ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, shape.w / 2, shape.h / 2, 0, 0, Math.PI * 2)
    }
    ctx.fillStyle = shape.color
    ctx.fill()
    ctx.strokeStyle = shape.id === selectedId ? SHAPE_COLORS.ink : SHAPE_COLORS.blue
    ctx.stroke()
    ctx.fillStyle = SHAPE_COLORS.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(shapeName(shape.kind, ordinals.get(shape.id) ?? 1, shape.label), shape.x + shape.w / 2, shape.y + shape.h / 2)
  }
  ctx.restore()
}

export function App() {
  const [shapes, setShapes] = useState<Shape[]>([] as Shape[])
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [color, setColor] = useState(SWATCHES[0]!.color)
  const [draft, setDraft] = useState<{ kind: 'rectangle' | 'ellipse'; x: number; y: number } | null>(null)
  const draftRef = useRef<{ kind: 'rectangle' | 'ellipse'; x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  draftRef.current = draft

  useEffect(() => {
    setShapes(shapesStore.list())
    setSelectedId(null)
  }, [])

  const ordinals = new Map<string, number>()
  for (const s of shapes) ordinals.set(s.id, (ordinals.get(s.id) ?? 0) + 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    drawScene(ctx, shapes, ordinals, selectedId, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, selectedId])

  function commit(label: string): string {
    const text = label.trim()
    return text === '' ? 'Shape' : text
  }

  function onPickColor(c: string) {
    setColor(c)
    if (selected) {
      shapesStore.update(selected.id, { color: c })
      setShapes(shapesStore.list())
    }
  }

  function addShape(kind: 'rectangle' | 'ellipse', x: number, y: number, w: number, h: number) {
    const shape = shapesStore.add({ kind, x, y, w, h, label: '', color })
    setShapes(shapesStore.list())
    setSelectedId(shape.id)
    setTool('select')
  }

  const selected = shapes.find((s) => s.id === selectedId) ?? null
  const selectedLabel = selected ? (selected.label === '' ? 'Shape' : selected.label) : 'Shape'
  const selectedName = selected
    ? shapeName(selected.kind, ordinals.get(selected.id) ?? 1, commit(selected.label))
    : null

  function pointInShape(shape: Shape, x: number, y: number): boolean {
    if (x < shape.x || x > shape.x + shape.w || y < shape.y || y > shape.y + shape.h) return false
    if (shape.kind === 'rectangle') return true
    const dx = (x - (shape.x + shape.w / 2)) / (shape.w / 2)
    const dy = (y - (shape.y + shape.h / 2)) / (shape.h / 2)
    return dx * dx + dy * dy <= 1
  }

  function hit(x: number, y: number): Shape | null {
    for (let i = shapes.length - 1; i >= 0; i -= 1) {
      const shape = shapes[i]!
      if (pointInShape(shape, x, y)) return shape
    }
    return null
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_W + rect.left
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_H + rect.top
    if (tool === 'select') {
      setSelectedId(hit(x, y)?.id ?? null)
      return
    }
    const kind = tool
    setDraft({ kind, x, y })
    draftRef.current = { kind, x, y }
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || !draft) return
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_W + rect.left
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_H + rect.top
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawScene(ctx, shapes, ordinals, selectedId, 1)
    ctx.lineWidth = 2
    ctx.strokeStyle = SHAPE_COLORS.ink
    ctx.fillStyle = color
    ctx.beginPath()
    const x0 = Math.min(draft.x, x)
    const y0 = Math.min(draft.y, y)
    const w = Math.abs(x - draft.x)
    const h = Math.abs(y - draft.y)
    if (draft.kind === 'rectangle') {
      ctx.rect(x0, y0, w, h)
    } else {
      ctx.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.stroke()
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const d = draftRef.current
    if (!d) return
    setDraft(null)
    draftRef.current = null
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_W + rect.left
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_H + rect.top
    const w = Math.abs(x - d.x)
    const h = Math.abs(y - d.y)
    if (w < 8 || h < 8) return
    addShape(d.kind, Math.min(d.x, x), Math.min(d.y, y), w, h)
  }

  function commitLabel(value: string) {
    if (!selected) return
    shapesStore.update(selected.id, { label: value })
    setShapes(shapesStore.list())
  }

  function removeSelected() {
    if (!selected) return
    shapesStore.remove(selected.id)
    setShapes(shapesStore.list())
    setSelectedId(null)
  }

  const options: ExportOption[] = [
    {
      id: 'png',
      label: 'PNG',
      mimeType: 'image/png',
      extension: 'png',
      getData: () => {
        const target = document.createElement('canvas')
        target.width = CANVAS_W
        target.height = CANVAS_H
        const ctx = target.getContext('2d')
        if (!ctx) return ''
        drawScene(ctx, shapes, ordinals, null, 1)
        return target.toDataURL('image/png')
      },
    },
  ]

  return (
    <AppShell
      name="Flowchart Editor"
      icon="whiteboard"
      hue="brown"
      category="Productivity"
      meta={`${shapes.length} ${shapes.length === 1 ? 'shape' : 'shapes'}`}
      status="Saved on this device"
      side={<Rail title="Flowchart Editor" note="Draw · label · export" chips={['Canvas', 'Local']} />}
    >
      <Card
        style={{ position: 'relative', zIndex: 1 }}
        mono={`${shapes.length} saved`}
        title="Canvas"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button kind={tool === 'select' ? 'primary' : 'secondary'} onClick={() => setTool('select')}>Select</Button>
            <Button kind={tool === 'rectangle' ? 'primary' : 'secondary'} onClick={() => setTool('rectangle')}>Rectangle</Button>
            <Button kind={tool === 'ellipse' ? 'primary' : 'secondary'} onClick={() => setTool('ellipse')}>Ellipse</Button>
            <Button kind="danger" onClick={removeSelected} disabled={!selected}>Delete</Button>
            <Button kind="secondary">Color</Button>
            {SWATCHES.map((sw) => (
              <button
                key={sw.name}
                type="button"
                aria-label={sw.name}
                onClick={() => onPickColor(sw.color)}
                style={{
                  width: 22,
                  height: 22,
                  padding: 0,
                  border: color === sw.color ? 'calc(2px * var(--sf)) solid var(--ink)' : 'calc(1px * var(--sf)) solid var(--hair-strong)',
                  borderRadius: 4,
                  background: sw.color,
                  cursor: 'pointer',
                }}
              />
            ))}
            <ExportMenu options={options} fileName="flowchart" ariaLabel="Export" />
          </div>
        }
      >
        <canvas
          ref={canvasRef}
          style={{ width: CANVAS_W, height: CANVAS_H, display: 'block', cursor: tool === 'select' ? 'default' : 'crosshair' }}
          aria-label="Flowchart canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </Card>
      <Card mono={selected ? 'Selected' : 'Nothing selected'} title="Shape">
        <FormGrid>
          <TextInput label="Label" value={selectedLabel} onChange={commitLabel} placeholder="Label for the selected shape" />
        </FormGrid>
      </Card>
      <Card mono={`${shapes.length} ${shapes.length === 1 ? 'layer' : 'layers'}`} title="Layers">
        {shapes.length === 0 ? (
          <EmptyState mono="Empty" title="No layers" detail="Draw a shape on the canvas to add it here." actionLabel="Draw a shape" onAction={() => setTool('rectangle')} />
        ) : (
          <List label="Layers">
            {shapes.map((shape) => (
              <Row
                key={shape.id}
                title={shapeName(shape.kind, ordinals.get(shape.id) ?? 1, shape.label)}
                hot={shape.id === selectedId}
                onClick={() => setSelectedId(shape.id)}
                action={
                    <Button kind="ghost" ariaLabel={`Remove ${shapeName(shape.kind, ordinals.get(shape.id) ?? 1, shape.label)}`} onClick={() => { shapesStore.remove(shape.id); setShapes(shapesStore.list()); if (selectedId === shape.id) setSelectedId(null) }}>
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
