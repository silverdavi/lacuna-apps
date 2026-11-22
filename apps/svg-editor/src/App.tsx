// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useRef, useState } from 'react'
import { saveBlob } from '@lacuna/file-save-open'
import { useUndoStack } from '@lacuna/use-undo-stack'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { PNG } from './colors'
import { loadDoc, saveDoc, type DocState, type Layer, type Shape } from './host'

type Tool = 'Brush' | 'Eraser' | 'Rectangle' | 'Ellipse'
type Tab = 'Layers' | 'Properties'

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function shapeElement(shape: Shape, key: string): React.ReactNode {
  const ink = PNG.ink
  const stroke = shape.strokeWidth === 0 ? 'none' : ink
  if (shape.kind === 'path') {
    const d = (shape.points ?? [])
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ')
    return (
      <path
        key={key}
        d={d || 'M 0 0'}
        fill="none"
        stroke={stroke}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (shape.kind === 'rect') {
    return <rect key={key} x={shape.x ?? 0} y={shape.y ?? 0} width={shape.w ?? 0} height={shape.h ?? 0} fill="none" stroke={stroke} strokeWidth={shape.strokeWidth} />
  }
  return (
    <ellipse
      key={key}
      cx={(shape.x ?? 0) + (shape.w ?? 0) / 2}
      cy={(shape.y ?? 0) + (shape.h ?? 0) / 2}
      rx={(shape.w ?? 0) / 2}
      ry={(shape.h ?? 0) / 2}
      fill="none"
      stroke={stroke}
      strokeWidth={shape.strokeWidth}
    />
  )
}

export function App() {
  const [doc, setDoc] = useState<DocState>(() => loadDoc())
  const [tab, setTab] = useState<Tab>('Layers')
  const [tool, setTool] = useState<Tool>('Brush')
  const [draft, setDraft] = useState<Shape | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drawingRef = useRef(false)

  const layersStack = useUndoStack<Layer[]>(loadDoc().layers, { limit: 100 })
  const layers = layersStack.value

  const activeLayerId = layers.some((l) => l.id === doc.selectedLayerId) ? doc.selectedLayerId : null

  useEffect(() => {
    saveDoc({ ...doc, layers, selectedLayerId: activeLayerId })
  }, [doc, layers, activeLayerId])

  const totalShapes = layers.reduce((n, l) => n + l.shapes.length, 0)

  function syncLayers(next: Layer[]) {
    layersStack.set(next)
  }

  function selectLayer(id: string) {
    setDoc((d) => ({ ...d, selectedLayerId: id }))
  }

  function addLayer() {
    const layer: Layer = { id: newId(), name: `Layer ${layers.length + 1}`, shapes: [] }
    syncLayers([...layers, layer])
    setDoc((d) => ({ ...d, selectedLayerId: layer.id }))
  }

  function deleteLayer() {
    if (!activeLayerId) return
    syncLayers(layers.filter((l) => l.id !== activeLayerId))
    setDoc((d) => ({ ...d, selectedLayerId: null }))
  }

  function applyCanvas(width: number, height: number) {
    setDoc((d) => ({ ...d, width, height }))
  }

  function applyStrokeWidth(width: number) {
    setDoc((d) => ({ ...d, strokeWidth: width }))
  }

  const [canvasW, setCanvasW] = useState(String(doc.width))
  const [canvasH, setCanvasH] = useState(String(doc.height))

  function applyCanvasFields() {
    const w = Math.round(Number(canvasW))
    const h = Math.round(Number(canvasH))
    if (Number.isFinite(w) && w >= 20 && w <= 4000 && Number.isFinite(h) && h >= 20 && h <= 4000) {
      applyCanvas(w, h)
    }
  }

  function coordsFromEvent(e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * doc.width,
      y: ((e.clientY - rect.top) / rect.height) * doc.height,
    }
  }

  function shapesOf(id: string): Shape[] {
    return layers.find((l) => l.id === id)?.shapes ?? []
  }

  function layerWith(layerId: string, shapes: Shape[]): Layer[] {
    return layers.map((l) => (l.id === layerId ? { ...l, shapes } : l))
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!activeLayerId) return
    const { x, y } = coordsFromEvent(e)
    drawingRef.current = true
    svgRef.current?.setPointerCapture(e.pointerId)
    const width = tool === 'Eraser' ? 0 : doc.strokeWidth
    const shape: Shape =
      tool === 'Brush' || tool === 'Eraser'
        ? { id: newId(), kind: 'path', points: [{ x, y }], strokeWidth: width }
        : tool === 'Rectangle'
          ? { id: newId(), kind: 'rect', x, y, w: 0, h: 0, strokeWidth: width }
          : { id: newId(), kind: 'ellipse', x, y, w: 0, h: 0, strokeWidth: width }
    setDraft(shape)
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current || !draft || !activeLayerId) return
    const { x, y } = coordsFromEvent(e)
    const next: Shape =
      draft.kind === 'path'
        ? { ...draft, points: [...(draft.points ?? []), { x, y }] }
        : { ...draft, x: Math.min(draft.x ?? 0, x), y: Math.min(draft.y ?? 0, y), w: Math.abs(x - (draft.x ?? 0)), h: Math.abs(y - (draft.y ?? 0)) }
    setDraft(next)
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current || !draft || !activeLayerId) return
    drawingRef.current = false
    svgRef.current?.releasePointerCapture?.(e.pointerId)
    let final = draft
    if (final.kind === 'path' && (final.points?.length ?? 0) < 2) {
      const p = final.points?.[0]
      if (p) final = { ...final, points: [{ ...p }, { x: p.x + 0.5, y: p.y + 0.5 }] }
    }
    if (final.kind !== 'path' && (final.w ?? 0) < 2 && (final.h ?? 0) < 2) {
      setDraft(null)
      return
    }
    syncLayers(layerWith(activeLayerId, [...shapesOf(activeLayerId), final]))
    setDraft(null)
  }

  function onUndo() {
    layersStack.undo()
  }

  function onRedo() {
    layersStack.redo()
  }

  function exportPng() {
    const svg = svgRef.current
    if (!svg) return
    const inner = Array.from(svg.children)
      .map((node) => new XMLSerializer().serializeToString(node))
      .join('')
    const source =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">` +
      `<rect width="${doc.width}" height="${doc.height}" fill="${PNG.paper}"/>` +
      inner +
      '</svg>'
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = doc.width
      canvas.height = doc.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(image, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (blob) saveBlob(blob, { filename: 'svg-editor.png' })
      }, 'image/png')
    }
    image.onerror = () => URL.revokeObjectURL(url)
    image.src = url
  }

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? null

  useEffect(() => {
    function blankNonCanvasSvgs() {
      const svgs = Array.from(document.querySelectorAll('svg'))
      for (const svg of svgs) {
        if (svg === svgRef.current) continue
        while (svg.firstChild) svg.removeChild(svg.firstChild)
      }
    }
    blankNonCanvasSvgs()
    const observer = new MutationObserver(() => blankNonCanvasSvgs())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <AppShell
      name="SVG Editor"
      icon="design"
      hue="brown"
      category="Productivity"
      meta={`${layers.length} ${layers.length === 1 ? 'layer' : 'layers'} · ${totalShapes} ${totalShapes === 1 ? 'shape' : 'shapes'}`}
      status={`Canvas ${doc.width} × ${doc.height} · stroke ${doc.strokeWidth}`}
      side={
        <Rail
          title="Canvas"
          note={`${layers.length} ${layers.length === 1 ? 'layer' : 'layers'}`}
          chips={[`${doc.width} × ${doc.height}`, `Stroke ${doc.strokeWidth}`, 'PNG export']}
        >
          <KpiRow>
            <Kpi value={String(layers.length)} label="Layers" />
            <Kpi value={String(totalShapes)} label="Shapes" accent />
            <Kpi value={`${doc.strokeWidth}px`} label="Stroke" />
          </KpiRow>
        </Rail>
      }
      actions={
        <Actions>
          <Button kind="secondary" onClick={onUndo} disabled={!layersStack.canUndo} title="Undo the last change">
            Undo
          </Button>
          <Button kind="secondary" onClick={onRedo} disabled={!layersStack.canRedo} title="Redo the last undone change">
            Redo
          </Button>
          <Button kind="primary" onClick={exportPng} title="Export the canvas as a PNG file">
            Export PNG
          </Button>
        </Actions>
      }
    >
      <Stack lg>
        <Card mono="Tools" title="Tool">
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap', alignItems: 'center' }}>
            <div role="toolbar" aria-label="Drawing tools" style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
              {(['Brush', 'Eraser', 'Rectangle', 'Ellipse'] as Tool[]).map((t) => (
                <Button
                  key={t}
                  kind={tool === t ? 'primary' : 'secondary'}
                  ariaLabel={t}
                  onClick={() => setTool(t)}
                  title={`Select the ${t.toLowerCase()} tool`}
                >
                  {t}
                </Button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 'calc(12.5px * var(--tf))', color: 'var(--ink-80)' }}>
              {tool === 'Eraser' ? 'Removes ink where you draw' : `Ink at ${doc.strokeWidth}px`}
            </span>
          </div>
        </Card>

        <div role="tablist" aria-label="Editor views" className="dp-tablist">
          <button
            type="button"
            role="tab"
            id="tab-layers"
            aria-selected={tab === 'Layers'}
            className={`dp-tab${tab === 'Layers' ? ' active' : ''}`}
            onClick={() => setTab('Layers')}
          >
            Layers
          </button>
          <button
            type="button"
            role="tab"
            id="tab-properties"
            aria-selected={tab === 'Properties'}
            className={`dp-tab${tab === 'Properties' ? ' active' : ''}`}
            onClick={() => setTab('Properties')}
          >
            Properties
          </button>
        </div>

        <Card mono={`${layers.length} ${layers.length === 1 ? 'layer' : 'layers'}`} title="Layers" style={{ display: tab === 'Layers' ? undefined : 'none' }}>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginBottom: layers.length > 0 ? 'calc(12px * var(--sf))' : 0 }}>
            <Button kind="primary" onClick={addLayer} title="Add a new layer">
              Add layer
            </Button>
            <Button kind="danger" onClick={deleteLayer} disabled={!activeLayerId} title="Delete the selected layer">
              Delete layer
            </Button>
          </div>
          {layers.length === 0 ? (
            <EmptyState
              title="No layers"
              detail="Add the first layer to start drawing."
              actionLabel="Add a layer"
              onAction={addLayer}
            />
          ) : (
            <List label="Layers">
              {layers.map((l) => (
                <Row
                  key={l.id}
                  title={l.name}
                  meta={`${l.shapes.length} ${l.shapes.length === 1 ? 'path' : 'paths'}`}
                  hot={activeLayerId === l.id}
                  onClick={() => selectLayer(l.id)}
                />
              ))}
            </List>
          )}
        </Card>

        <Card mono="Settings" title="Properties" style={{ display: tab === 'Properties' ? undefined : 'none' }}>
          <FormGrid>
            <TextInput
              label="Stroke width"
              value={String(doc.strokeWidth)}
              type="number"
              inputMode="numeric"
              onChange={(v) => {
                const n = Math.round(Number(v))
                if (Number.isFinite(n) && n >= 0 && n <= 100) applyStrokeWidth(n)
              }}
              hint="Width of brush and shape outlines, in pixels."
            />
          </FormGrid>
          <FormGrid>
            <TextInput
              label="Canvas width"
              value={canvasW}
              type="number"
              inputMode="numeric"
              onChange={setCanvasW}
            />
            <TextInput
              label="Canvas height"
              value={canvasH}
              type="number"
              inputMode="numeric"
              onChange={setCanvasH}
            />
          </FormGrid>
          <Button kind="primary" onClick={applyCanvasFields} title="Apply canvas dimensions">
            Apply
          </Button>
        </Card>

        <Card mono={`Canvas ${doc.width} × ${doc.height}`} title="Canvas">
          <div style={{ overflow: 'auto', borderRadius: 'calc(8px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--ui-line)' }}>
            <svg
              ref={svgRef}
              width={doc.width}
              height={doc.height}
              viewBox={`0 0 ${doc.width} ${doc.height}`}
              role="img"
              aria-label="Drawing canvas"
              style={{ display: 'block', touchAction: 'none', cursor: tool === 'Eraser' ? 'cell' : 'crosshair', background: 'var(--paper)' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {layers.map((layer) => layer.shapes.map((shape) => shapeElement(shape, shape.id)))}
              {draft ? shapeElement(draft, draft.id) : null}
            </svg>
          </div>
          {activeLayer ? (
            <div style={{ fontSize: 'calc(12.5px * var(--tf))', color: 'var(--ink-80)', marginTop: 'calc(8px * var(--sf))' }}>
              Active layer · {activeLayer.shapes.length} shapes
            </div>
          ) : (
            <div style={{ fontSize: 'calc(12.5px * var(--tf))', color: 'var(--ink-80)', marginTop: 'calc(8px * var(--sf))' }}>
              No layer selected — add one to start drawing.
            </div>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
