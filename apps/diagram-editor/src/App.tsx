// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Stack,
} from '@lacuna/ui'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { SHAPE_COLORS, SWATCHES } from './colors'
import { CANVAS_H, CANVAS_W, drawDiagram, exportPng } from './canvas'
import { CANVAS_STROKE } from './colors'
import {
  isDiagramState,
  shapesStore,
  type ColorName,
  type DiagramState,
  type Shape,
  type ShapeKind,
} from './host'

type Tool = 'select' | 'rect' | 'ellipse'
const KIND_NAMES: Record<ShapeKind, string> = { rect: 'Rectangle', ellipse: 'Ellipse' }
const APP_ID = 'lacuna.diagram-editor'
const BACKUP_VERSION = 1

function shapeDisplayName(shape: Shape, ordinal: number): string {
  const text = shape.label.trim()
  if (text !== '') return text
  return `${KIND_NAMES[shape.kind]} ${ordinal}`
}

export function App() {
  const [state, setState] = useState<DiagramState>(() => {
    const s = shapesStore.get()
    return { shapes: s.shapes, connectors: s.connectors ?? [] }
  })
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [color, setColor] = useState<ColorName>('blue')
  const [openColor, setOpenColor] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const shapes = state.shapes
  const connectors = state.connectors
  const selected = shapes.find((s) => s.id === selectedId) ?? null
  const ordinals = new Map<string, number>()
  for (const shape of shapes) ordinals.set(shape.id, (ordinals.get(shape.id) ?? 0) + 1)

  useEffect(() => {
    shapesStore.set(state)
  }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (drag && tool !== 'select') {
      const x = Math.min(drag.x0, drag.x1)
      const y = Math.min(drag.y0, drag.y1)
      const w = Math.abs(drag.x1 - drag.x0)
      const h = Math.abs(drag.y1 - drag.y0)
      const kind: ShapeKind = tool === 'ellipse' ? 'ellipse' : 'rect'
      drawDiagram(canvas, state, null)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        if (kind === 'rect') {
          ctx.beginPath()
          ctx.rect(x, y, w, h)
        } else {
          ctx.beginPath()
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
        }
        ctx.fillStyle = SHAPE_COLORS[color]
        ctx.fill()
        ctx.strokeStyle = CANVAS_STROKE
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      return
    }
    drawDiagram(canvas, state, selectedId)
  }, [state, selectedId, drag, tool, color, shapes, connectors])

  function commit(next: DiagramState) {
    setState(next)
  }

  function toCanvas(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.max(0, Math.min(CANVAS_W, (event.clientX - rect.left) * scaleX))
    const y = Math.max(0, Math.min(CANVAS_H, (event.clientY - rect.top) * scaleY))
    return { x, y }
  }

  function pointInShape(shape: Shape, x: number, y: number): boolean {
    if (x < shape.x || x > shape.x + shape.w || y < shape.y || y > shape.y + shape.h) return false
    if (shape.kind === 'rect') return true
    const dx = (x - (shape.x + shape.w / 2)) / (shape.w / 2 || 1)
    const dy = (y - (shape.y + shape.h / 2)) / (shape.h / 2 || 1)
    return dx * dx + dy * dy <= 1
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === 'select') {
      const { x, y } = toCanvas(event)
      let found: string | null = null
      for (let i = shapes.length - 1; i >= 0; i -= 1) {
        const shape = shapes[i]!
        if (pointInShape(shape, x, y)) {
          found = shape.id
          break
        }
      }
      setSelectedId(found)
      return
    }
    const { x, y } = toCanvas(event)
    setDrag({ x0: x, y0: y, x1: x, y1: y })
    canvasRef.current?.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag) return
    const { x, y } = toCanvas(event)
    setDrag({ ...drag, x1: x, y1: y })
  }

  function onPointerUp() {
    if (!drag) return
    const x = Math.min(drag.x0, drag.x1)
    const y = Math.min(drag.y0, drag.y1)
    const w = Math.abs(drag.x1 - drag.x0)
    const h = Math.abs(drag.y1 - drag.y0)
    setDrag(null)
    if (w < 8 || h < 8) return
    const kind: ShapeKind = tool === 'ellipse' ? 'ellipse' : 'rect'
    const shape: Shape = { id: crypto.randomUUID(), kind, x, y, w, h, label: '', color }
    commit({ shapes: [...shapes, shape], connectors })
    setSelectedId(shape.id)
    setTool('select')
  }

  function pickColor(next: ColorName) {
    setColor(next.toLowerCase() as ColorName)
    if (selected) {
      commit({ shapes: shapes.map((s) => (s.id === selected.id ? { ...s, color: next.toLowerCase() as ColorName } : s)), connectors })
    }
    setOpenColor(false)
  }

  function commitLabel(value: string) {
    if (!selected) return
    commit({ shapes: shapes.map((s) => (s.id === selected.id ? { ...s, label: value } : s)), connectors })
  }

  function removeShape(id: string) {
    commit({ shapes: shapes.filter((s) => s.id !== id), connectors: connectors.filter((c) => c.from !== id && c.to !== id) })
    if (selectedId === id) setSelectedId(null)
  }

  function moveShape(id: string, dx: number, dy: number) {
    commit({
      shapes: shapes.map((s) =>
        s.id === id
          ? { ...s, x: Math.max(0, Math.min(CANVAS_W - s.w, s.x + dx)), y: Math.max(0, Math.min(CANVAS_H - s.h, s.y + dy)) }
          : s,
      ),
      connectors,
    })
  }

  function connect() {
    if (!selected || shapes.length < 2) return
    const from = selected
    const to = shapes.find((s) => s.id !== from.id)
    if (!to) return
    commit({ shapes, connectors: [...connectors, { id: crypto.randomUUID(), from: from.id, to: to.id }] })
  }

  function pickImport() {
    importInputRef.current?.click()
  }

  async function onImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const result = importBackup<DiagramState>(text, {
        currentVersion: BACKUP_VERSION,
        validate: (record) => (isDiagramState(record.data) ? null : 'not a valid flowchart backup'),
      })
      if (result.records.length === 0) {
        setImportMsg('No valid backup found in that file.')
        return
      }
      const backup = result.records[0]!
      commit(backup.data)
      setSelectedId(null)
      setImportMsg(`Imported ${backup.data.shapes.length} shapes and ${backup.data.connectors.length} connectors.`)
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  const options: ExportOption[] = [
    {
      id: 'png',
      label: 'PNG',
      mimeType: 'image/png',
      extension: 'png',
      getData: () => {
        exportPng(state)
        return ''
      },
    },
    {
      id: 'json',
      label: 'JSON (full backup)',
      mimeType: 'application/json',
      extension: 'json',
      getData: () =>
        exportBackup({
          appId: APP_ID,
          version: BACKUP_VERSION,
          filename: 'flowchart-editor',
          records: [
            {
              id: 'diagram',
              data: state,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }),
    },
  ]

  const selectedLabel = selected ? (selected.label.trim() !== '' ? selected.label : '') : ''

  const toolbar = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'calc(8px * var(--sf))',
        alignItems: 'center',
      }}
    >
      <Button kind={tool === 'select' ? 'primary' : 'secondary'} onClick={() => setTool('select')}>
        Select
      </Button>
      <Button kind={tool === 'rect' ? 'primary' : 'secondary'} onClick={() => setTool('rect')}>
        Rectangle
      </Button>
      <Button kind={tool === 'ellipse' ? 'primary' : 'secondary'} onClick={() => setTool('ellipse')}>
        Ellipse
      </Button>
      <Button kind="danger" onClick={() => selected && removeShape(selected.id)} disabled={!selected}>
        Delete
      </Button>
      <Button kind="secondary" onClick={connect} disabled={!selected || shapes.length < 2}>
        Connect
      </Button>
      <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                type="button"
                onClick={() => setOpenColor((open) => !open)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'calc(5px * var(--sf))',
                  padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))',
                  fontFamily: 'var(--sans)',
                  fontSize: 'calc(13px * var(--tf))',
                  color: 'var(--ink)',
                  background: 'var(--ui-card)',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  borderRadius: 'calc(6px * var(--sf))',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 'calc(12px * var(--sf))',
                    height: 'calc(12px * var(--sf))',
                    borderRadius: 'calc(3px * var(--sf))',
                    background: color === 'red' ? SHAPE_COLORS.red : color === 'green' ? SHAPE_COLORS.green : color === 'amber' ? SHAPE_COLORS.amber : color === 'ink' ? SHAPE_COLORS.ink : SHAPE_COLORS.blue,
                    display: 'inline-block',
                  }}
                />
                Color
              </button>
              {openColor && (
                <div
                  aria-label="Color"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 'calc(4px * var(--sf))',
                    zIndex: 30,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(4px * var(--sf))',
                    padding: 'calc(6px * var(--sf))',
                    background: 'var(--ui-card)',
                    border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                    borderRadius: 'calc(6px * var(--sf))',
                    boxShadow: 'var(--shadow)',
                    minWidth: 'calc(120px * var(--sf))',
                  }}
                >
                  {SWATCHES.map((sw) => (
                    <button
                      key={sw.name}
                      type="button"
                      aria-label={sw.name}
                      onClick={() => pickColor(sw.name as ColorName)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'calc(6px * var(--sf))',
                        padding: 'calc(4px * var(--sf)) calc(6px * var(--sf))',
                        fontFamily: 'var(--sans)',
                        fontSize: 'calc(13px * var(--tf))',
                        color: 'var(--ink)',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'calc(4px * var(--sf))',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 'calc(14px * var(--sf))',
                          height: 'calc(14px * var(--sf))',
                          borderRadius: 'calc(3px * var(--sf))',
                          background: sw.color,
                          display: 'inline-block',
                          flex: '0 0 auto',
                        }}
                      />
                      {sw.name}
                    </button>
                  ))}
                </div>
              )}
      </div>
      <ExportMenu options={options} fileName="flowchart" ariaLabel="Export" disabled={shapes.length === 0} />
    </div>
  )

  const main = (
    <Stack lg>
      <Card mono={`${shapes.length} shapes`} title="Canvas">
        <div
          style={{
            position: 'relative',
            width: 'calc(960px * var(--sf))',
            height: 'calc(520px * var(--sf))',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            role="img"
            aria-label="Flowchart canvas"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 50,
              width: 'calc(960px * var(--sf))',
              height: 'calc(520px * var(--sf))',
              display: 'block',
              cursor: tool === 'select' ? 'default' : 'crosshair',
              background: 'var(--ui-card)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(6px * var(--sf))',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          {shapes.length === 0 && !drag && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <EmptyState
                mono="Empty"
                title="No shapes yet"
                detail="Pick Rectangle or Ellipse, then drag on the canvas to draw."
                actionLabel="Draw a shape"
                onAction={() => setTool('rect')}
              />
            </div>
          )}
        </div>
      </Card>

      <Card mono={selected ? 'Selected' : 'Nothing selected'} title="Shape">
        {selected ? (
          <Stack>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                commitLabel(selectedLabel)
              }}
            >
              <label style={{ display: 'block' }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(11px * var(--tf))',
                    letterSpacing: 'calc(1px * var(--tf))',
                    textTransform: 'uppercase',
                    color: 'var(--mid)',
                    marginBottom: 'calc(4px * var(--sf))',
                  }}
                >
                  Label
                </span>
                <input
                  value={selectedLabel}
                  onChange={(event) => commitLabel(event.target.value)}
                  placeholder="Label for the selected shape"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--sans)',
                    fontSize: 'calc(15px * var(--tf))',
                    padding: 'calc(8px * var(--sf))',
                    border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                    borderRadius: 'calc(6px * var(--sf))',
                    background: 'var(--ui-card)',
                    color: 'var(--ink)',
                  }}
                />
              </label>
            </form>
            <Actions>
              <Button kind="ghost" ariaLabel="Move left" onClick={() => moveShape(selected.id, -10, 0)}>
                Left
              </Button>
              <Button kind="ghost" ariaLabel="Move right" onClick={() => moveShape(selected.id, 10, 0)}>
                Right
              </Button>
              <Button kind="ghost" ariaLabel="Move up" onClick={() => moveShape(selected.id, 0, -10)}>
                Up
              </Button>
              <Button kind="ghost" ariaLabel="Move down" onClick={() => moveShape(selected.id, 0, 10)}>
                Down
              </Button>
            </Actions>
          </Stack>
        ) : (
          <Body sm>Select a shape on the canvas or in the Layers panel to edit its label and position.</Body>
        )}
      </Card>

      <Card mono={`${shapes.length} ${shapes.length === 1 ? 'layer' : 'layers'}`} title="Layers">
        {shapes.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No layers"
            detail="Draw a shape on the canvas to add it here."
            actionLabel="Draw a shape"
            onAction={() => setTool('rect')}
          />
        ) : (
          <List label="Layers">
            {shapes.map((shape) => (
              <Row
                key={shape.id}
                title={shapeDisplayName(shape, ordinals.get(shape.id) ?? 1)}
                meta={KIND_NAMES[shape.kind]}
                hot={shape.id === selectedId}
                onClick={() => setSelectedId(shape.id)}
                action={
                  <Button
                    kind="ghost"
                    ariaLabel={`Remove ${shapeDisplayName(shape, ordinals.get(shape.id) ?? 1)}`}
                    onClick={() => removeShape(shape.id)}
                  >
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </Stack>
  )

  const side = (
    <Rail
      title="Flowchart Editor"
      note="Draw · label · connect · export"
      chips={['Canvas', 'Layers', 'Export', 'Local']}
    >
      <Stack lg>
        <Card mono="Tools" title="Toolbar">
          {toolbar}
        </Card>
        <Card mono="Overview" title="Summary">
          {shapes.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No shapes yet"
              detail="Draw shapes to see a summary of your diagram."
              actionLabel="Draw a shape"
              onAction={() => setTool('rect')}
            />
          ) : (
            <KpiRow>
              <Kpi value={String(shapes.length)} label="Shapes" accent />
              <Kpi value={String(connectors.length)} label="Connectors" />
              <Kpi value={String(shapes.filter((s) => s.kind === 'rect').length)} label="Rectangles" />
              <Kpi value={String(shapes.filter((s) => s.kind === 'ellipse').length)} label="Ellipses" />
            </KpiRow>
          )}
        </Card>
        <Card mono="Local" title="Saved on this device">
          <Body sm>
            Your diagram is saved to this device automatically. Import a JSON backup to restore a previous version.
          </Body>
          <Actions>
            <Button kind="secondary" onClick={pickImport}>
              Import backup
            </Button>
            <Button
              kind="ghost"
              onClick={() => commit({ shapes: [], connectors: [] })}
              disabled={shapes.length === 0 && connectors.length === 0}
            >
              Clear all
            </Button>
          </Actions>
          {importMsg && <Body sm style={{ color: 'var(--mid)' }}>{importMsg}</Body>}
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            aria-hidden
            tabIndex={-1}
            onChange={onImportFile}
          />
        </Card>
        <Card mono="Tips" title="How to use">
          <Body sm>
            Pick a shape tool, then drag on the canvas. Select a shape to label, recolor, or move it. Use Connect to link the
            selected shape to the next one.
          </Body>
        </Card>
      </Stack>
    </Rail>
  )

  return (
    <AppShell
      name="Flowchart Editor"
      icon="whiteboard"
      hue="brown"
      category="Productivity"
      meta={`${shapes.length} ${shapes.length === 1 ? 'shape' : 'shapes'} · ${connectors.length} ${connectors.length === 1 ? 'connector' : 'connectors'}`}
      status="Saved on this device"
      side={side}
    >
      {main}
    </AppShell>
  )
}
