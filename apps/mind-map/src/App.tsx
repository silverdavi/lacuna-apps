import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { AppShell, Button, Card, SectionLabel } from '@lacuna/ui'
import { RangeSlider } from '@lacuna/range-slider'
import { saveBlob } from '@lacuna/file-save-open'
import { host, type MapEdge, type MapNode, type MapStroke, type StrokePoint } from './host'
import { INK, PAPER } from './colors'

type Tool = 'select' | 'brush' | 'eraser'
type Point = { x: number; y: number }

const CANVAS_H = 520
const CANVAS_W = 900
const PAD = 24
const EDGE_W = 2
const DEFAULT_BRUSH = 5
const SPACING_X = 150
const SPACING_Y = 56

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function rectFor(node: MapNode): Rect {
  return { x: node.x - 50, y: node.y - 18, w: 100, h: 36 }
}

function pickNodePos(nodes: MapNode[]): Point {
  const origin: Point = { x: PAD + 60, y: PAD + 18 }
  const taken = nodes.map(rectFor)
  for (let i = 0; i < 500; i += 1) {
    const x = origin.x + Math.floor(i / 6) * SPACING_X
    const y = origin.y + (i % 6) * SPACING_Y
    const r: Rect = { x: x - 50, y: y - 18, w: 100, h: 36 }
    if (!taken.some((t) => overlaps(r, t))) return { x, y }
  }
  return { x: origin.x + 750, y: origin.y + 100 }
}

function autoLayout(nodes: MapNode[]): MapNode[] {
  if (nodes.length === 0) return []
  const sorted = [...nodes].sort((a, b) => a.label.localeCompare(b.label))
  const placed: Rect[] = []
  const out: MapNode[] = []
  for (const node of sorted) {
    const halfW = 65
    const halfH = 30
    let x = 0
    let y = 0
    let found = false
    outer: for (let gy = 0; gy < 80; gy += 1) {
      for (let gx = 0; gx < 60; gx += 1) {
        const cx = PAD + halfW + gx * (halfW + 24)
        const cy = PAD + halfH + gy * (halfH + 24)
        const r: Rect = { x: cx - halfW, y: cy - halfH, w: halfW * 2, h: halfH * 2 }
        if (placed.some((p) => overlaps(r, p))) continue
        x = cx
        y = cy
        found = true
        break outer
      }
    }
    if (!found) {
      x = PAD + halfW + out.length * 140
      y = PAD + halfH
    }
    placed.push({ x: x - halfW, y: y - halfH, w: halfW * 2, h: halfH * 2 })
    out.push({ ...node, x, y })
  }
  return out
}

function drawEdges(ctx: CanvasRenderingContext2D, nodes: MapNode[], edges: MapEdge[]): void {
  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = EDGE_W
  ctx.lineCap = 'round'
  for (const edge of edges) {
    const a = byId.get(edge.from)
    const b = byId.get(edge.to)
    if (!a || !b) continue
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: MapStroke[]): void {
  for (const s of strokes) {
    const pts = s.points
    if (pts.length === 0) continue
    ctx.save()
    ctx.fillStyle = s.color
    const x0 = Math.round(pts[0]!.x)
    const yMax = Math.round(Math.max(...pts.map((p) => p.y)))
    const w = Math.round(s.width)
    const left = x0 - Math.floor(w / 2)
    ctx.fillRect(left, 0, w, Math.max(1, yMax))
    ctx.restore()
  }
}

function paintScene(ctx: CanvasRenderingContext2D, nodes: MapNode[], edges: MapEdge[], strokes: MapStroke[]): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  drawEdges(ctx, nodes, edges)
  drawStrokes(ctx, strokes)
}

function distToStroke(stroke: MapStroke, p: Point): number {
  let best = Infinity
  for (const q of stroke.points) {
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    if (d < best) best = d
  }
  return best
}

export function App() {
  const [nodes, setNodes] = useState<MapNode[]>([])
  const [edges, setEdges] = useState<MapEdge[]>([])
  const [strokes, setStrokes] = useState<MapStroke[]>([])
  const [tool, setTool] = useState<Tool>('select')
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const nodesRef = useRef(nodes)
  nodesRef.current = nodes
  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const toolRef = useRef(tool)
  toolRef.current = tool
  const connectSourceRef = useRef(connectSource)
  connectSourceRef.current = connectSource
  const renameIdRef = useRef(renamingId)
  renameIdRef.current = renamingId
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)


  const commit = useCallback(() => {
    host.save({ nodes: nodesRef.current, edges: edgesRef.current, strokes: strokesRef.current })
  }, [])

  const showFlash = useCallback((msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 2500)
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    paintScene(ctx, nodesRef.current, edgesRef.current, strokesRef.current)
  }, [])

  const redraw = useCallback(() => {
    drawCanvas()
    commit()
  }, [drawCanvas, commit])

  const handleNodeClick = useCallback(
    (e: ReactMouseEvent, id: string) => {
      e.stopPropagation()
      if (!connectMode) {
        setSelectedId(id)
        return
      }
      const src = connectSourceRef.current
      if (src === id) {
        setSelectedId(id)
        return
      }
      if (!src) {
        setConnectSource(id)
        setSelectedId(id)
        showFlash('Click the target node to connect')
        return
      }
      const exists = edgesRef.current.some(
        (ed) => (ed.from === src && ed.to === id) || (ed.from === id && ed.to === src),
      )
      if (!exists) {
        setEdges((prev) => [...prev, { id: uid(), from: src, to: id }])
      }
      setConnectSource(null)
      showFlash('Connected')
    },
    [connectMode, showFlash],
  )

  const handleNodeDblClick = useCallback((e: ReactMouseEvent, id: string) => {
    e.stopPropagation()
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node) return
    setRenamingId(id)
    setRenameValue(node.label)
    setSelectedId(id)
  }, [])

  const commitRename = useCallback(() => {
    const id = renameIdRef.current
    if (!id) return
    const label = renameValue.trim() || 'New Idea'
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, label } : n)))
    setRenamingId(null)
    redraw()
  }, [renameValue, redraw])

  const addNode = useCallback(() => {
    const pos = pickNodePos(nodesRef.current)
    const id = uid()
    setNodes((prev) => [...prev, { id, label: 'New Idea', x: pos.x, y: pos.y }])
    setSelectedId(id)
    showFlash('Added node')
    redraw()
  }, [redraw, showFlash])

  const toggleConnect = useCallback(() => {
    setConnectMode((prev) => {
      const next = !prev
      if (next) {
        setConnectSource(null)
        setSelectedId(null)
        showFlash('Connect: click the source node')
      } else {
        setConnectSource(null)
        showFlash('Connect off')
      }
      return next
    })
  }, [showFlash])

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id))
      setEdges((prev) => prev.filter((ed) => ed.from !== id && ed.to !== id))
      if (selectedId === id) setSelectedId(null)
      if (connectSourceRef.current === id) setConnectSource(null)
      showFlash('Deleted node')
      redraw()
    },
    [selectedId, redraw, showFlash],
  )

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    deleteNode(selectedId)
  }, [selectedId, deleteNode])

  const runAutoLayout = useCallback(() => {
    setNodes((prev) => autoLayout(prev))
    showFlash('Layout updated')
    commit()
  }, [showFlash, commit])

  useEffect(() => {
    if (renamingId == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitRename()
      } else if (e.key === 'Escape') {
        setRenamingId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [renamingId, commitRename])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (renamingId != null) return
      const target = e.target as HTMLElement | null
      const inField =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (inField) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') {
        setConnectSource(null)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [renamingId, deleteSelected])

  useEffect(() => {
    const existing = host.load()
    if (existing) {
      setNodes(existing.nodes)
      setEdges(existing.edges)
      setStrokes(existing.strokes)

    }
  }, [])

  useEffect(() => {
    drawCanvas()
    commit()
  }, [nodes, edges, strokes, drawCanvas, commit])

  const activeStrokeRef = useRef<StrokePoint[]>([])
  const lastPointRef = useRef<Point | null>(null)
  const isDrawingRef = useRef(false)

  const toCanvasCoords = useCallback((e: ReactPointerEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  const handleDrawDown = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (toolRef.current === 'select') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const c = toCanvasCoords(e)
    activeStrokeRef.current = [{ x: c.x, y: c.y, pressure: e.pressure }]
    lastPointRef.current = c
    isDrawingRef.current = true
  }, [toCanvasCoords])

  const handleDrawMove = useCallback((e: ReactPointerEvent) => {
    if (!isDrawingRef.current) return
    const c = toCanvasCoords(e)
    const last = lastPointRef.current
    if (last && Math.hypot(c.x - last.x, c.y - last.y) < 1) return
    lastPointRef.current = c
    activeStrokeRef.current = [...activeStrokeRef.current, { x: c.x, y: c.y, pressure: e.pressure }]
  }, [toCanvasCoords])

  const handleDrawUp = useCallback((e: ReactPointerEvent) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* best effort */ }
    const pts = activeStrokeRef.current
    activeStrokeRef.current = []
    if (pts.length === 0) return
    if (toolRef.current === 'eraser') {
      setStrokes((prev) => prev.filter((s) => !pts.some((p) => distToStroke(s, p) < 14)))
      showFlash('Erased')
      return
    }
    const next: MapStroke = {
      id: uid(),
      points: pts,
      color: INK,
      width: 5,
    }
    setStrokes((prev) => [...prev, next])
    showFlash('Drew')
  }, [showFlash, brushSize])

  const exportPng = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    paintScene(ctx, nodesRef.current, edgesRef.current, strokesRef.current)
    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, { filename: 'mind-map.png', mimeType: 'image/png' })
    }, 'image/png')
  }, [])

  const connectionCount = edges.length
  const statusText = flash ?? `${nodes.length} nodes, ${connectionCount} connection${connectionCount === 1 ? '' : 's'}`

  return (
    <AppShell
      name="Mind Map"
      icon="whiteboard"
      hue="brown"
      category="Productivity"
      meta={`${nodes.length} nodes`}
      status={statusText}
      actions={
        <>
          <Button kind="primary" onClick={addNode} title="Add a new idea node">
            Add Node
          </Button>
          <Button kind={connectMode ? 'ink' : 'secondary'} onClick={toggleConnect} title="Toggle connect mode">
            Connect
          </Button>
          <Button kind={tool === 'brush' ? 'ink' : 'secondary'} onClick={() => setTool('brush')} title="Draw freehand">
            Brush
          </Button>
          <Button kind={tool === 'eraser' ? 'ink' : 'secondary'} onClick={() => setTool('eraser')} title="Erase strokes">
            Eraser
          </Button>
          <Button onClick={exportPng} title="Download the map as a PNG">
            Export PNG
          </Button>
          <Button onClick={runAutoLayout} title="Arrange nodes without overlap">
            Auto Layout
          </Button>
        </>
      }
    >
      <Card title="Board" flush>
        <div
          style={{
            position: 'relative',
            width: `calc(${CANVAS_W}px * var(--sf))`,
            height: `calc(${CANVAS_H}px * var(--sf))`,
            overflow: 'hidden',
            background: 'var(--paper)',
            border: 'calc(1px * var(--sf)) solid var(--ink)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={handleDrawDown}
            onPointerMove={handleDrawMove}
            onPointerUp={handleDrawUp}
            style={{
              position: 'absolute',
              inset: 0,
              width: `calc(${CANVAS_W}px * var(--sf))`,
              height: `calc(${CANVAS_H}px * var(--sf))`,
              touchAction: 'none',
              cursor: tool === 'select' ? 'default' : 'crosshair',
            }}
          />
          {nodes.map((node) => {
            const r = rectFor(node)
            const isRenaming = renamingId === node.id
            const active = selectedId === node.id || connectSource === node.id
            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: `calc(${r.x}px * var(--sf))`,
                  top: `calc(${r.y}px * var(--sf))`,
                  width: `calc(${r.w}px * var(--sf))`,
                  height: `calc(${r.h}px * var(--sf))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: 'calc(4px * var(--sf))',
                  background: active ? 'var(--accent-soft)' : 'var(--paper)',
                  border: `calc(${active ? 2 : 1}px * var(--sf)) solid var(--ink)`,
                  borderRadius: 'calc(8px * var(--sf))',
                  fontFamily: 'var(--sans)',
                  fontSize: 'calc(14px * var(--tf))',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  boxShadow: active
                    ? 'calc(3px * var(--sf)) calc(3px * var(--sf)) 0 var(--ink)'
                    : 'calc(2px * var(--sf)) calc(2px * var(--sf)) 0 var(--ink)',
                  overflow: 'hidden',
                }}
                onClick={(e) => handleNodeClick(e, node.id)}
                onDoubleClick={(e) => handleNodeDblClick(e, node.id)}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenamingId(null)
                      e.stopPropagation()
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'var(--paper)',
                      fontFamily: 'var(--sans)',
                      fontSize: 'calc(14px * var(--tf))',
                      color: 'var(--ink)',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span title={node.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'calc(12px * var(--sf))',
            marginTop: 'calc(12px * var(--sf))',
          }}
        >
          <SectionLabel accent>Tool</SectionLabel>
          <RangeSlider
            label="Brush size"
            value={brushSize}
            onChange={(v) => setBrushSize(v)}
            min={1}
            max={24}
            step={1}
            format={(v) => `${v}px`}
          />
          <span className="lc-mono lc-mono-sm lc-faint">
            {connectMode
              ? connectSource
                ? 'Click the target node to connect it.'
                : 'Click the source node to start a connection.'
              : tool === 'brush'
                ? 'Draw on the board with the brush.'
                : tool === 'eraser'
                  ? 'Drag across strokes to erase them.'
                  : 'Click a node to select, double-click to rename, Delete to remove.'}
          </span>
        </div>
      </Card>
    </AppShell>
  )
}
