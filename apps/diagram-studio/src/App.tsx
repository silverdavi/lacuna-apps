// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  FormGrid,
  Keys,
  List,
  Pills,
  PrimaryButton,
  Rail,
  Row,
  Select,
  TextInput,
} from '@lacuna/ui'
import { openFile, saveJSON, saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useUndoStack } from '@lacuna/use-undo-stack'
import {
  autoLayout,
  createDiagramTemplate,
  DIAGRAM_TEMPLATES,
  fromMermaid,
  GRID_STEP,
  snap,
  toMermaid,
  type DiagramDoc,
  type DiagramEdge,
  type DiagramNode,
  type DiagramTemplateId,
  type NodeShape,
  type NodeTone,
} from './model'
import { diagramStore } from './host'

const SHAPE_OPTIONS: { value: NodeShape; label: string }[] = [
  { value: 'process', label: 'Process (Box)' },
  { value: 'decision', label: 'Decision (Diamond)' },
  { value: 'terminal', label: 'Terminal (Pill)' },
  { value: 'database', label: 'Database (Cylinder)' },
  { value: 'note', label: 'Note (Slanted)' },
]

const TONE_OPTIONS: { value: NodeTone; label: string }[] = [
  { value: 'default', label: 'Ink' },
  { value: 'accent', label: 'Rust Accent' },
  { value: 'cobalt', label: 'Cobalt' },
  { value: 'green', label: 'Green' },
  { value: 'gold', label: 'Gold' },
]

const ZOOM_LABELS = ['75%', '100%', '125%']

function renderNodeShape(node: DiagramNode, cls: string) {
  const { x, y, w, h, shape } = node
  if (shape === 'decision') {
    const cx = x + w / 2
    const cy = y + h / 2
    return (
      <polygon
        points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`}
        className={cls}
      />
    )
  }
  if (shape === 'terminal') {
    return <rect x={x} y={y} width={w} height={h} rx={h / 2} className={cls} />
  }
  if (shape === 'database') {
    const ry = 10
    return (
      <g>
        <path
          d={`M ${x} ${y + ry} L ${x} ${y + h - ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} L ${x + w} ${y + ry}`}
          className={cls}
        />
        <ellipse cx={x + w / 2} cy={y + ry} rx={w / 2} ry={ry} className={cls} />
      </g>
    )
  }
  if (shape === 'note') {
    const sk = 14
    return (
      <polygon
        points={`${x + sk},${y} ${x + w},${y} ${x + w - sk},${y + h} ${x},${y + h}`}
        className={cls}
      />
    )
  }
  return <rect x={x} y={y} width={w} height={h} rx={2} className={cls} />
}

export function App() {
  const initialDoc = useMemo(() => diagramStore.get(), [])
  const stack = useUndoStack<DiagramDoc>(initialDoc, { limit: 60 })
  const doc = stack.value

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(doc.nodes[0]?.id ?? null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [snapGrid, setSnapGrid] = useState<boolean>(true)
  const [zoomLabel, setZoomLabel] = useState<string>('100%')
  const [templateChoice, setTemplateChoice] = useState<DiagramTemplateId>('api')
  const [mermaidDraft, setMermaidDraft] = useState<string>(() => toMermaid(initialDoc))
  const [notice, setNotice] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeShape, setNewNodeShape] = useState<NodeShape>('process')
  const [newEdgeFrom, setNewEdgeFrom] = useState(doc.nodes[0]?.id ?? '')
  const [newEdgeTo, setNewEdgeTo] = useState(doc.nodes[1]?.id ?? '')
  const [newEdgeLabel, setNewEdgeLabel] = useState('')

  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const jsonInputRef = useRef<HTMLInputElement | null>(null)
  const clipboard = useClipboard()

  useEffect(() => {
    diagramStore.set(doc)
    setMermaidDraft(toMermaid(doc))
  }, [doc])

  const selectedNode = selectedNodeId ? doc.nodes.find((n) => n.id === selectedNodeId) ?? null : null
  const selectedEdge = selectedEdgeId ? doc.edges.find((e) => e.id === selectedEdgeId) ?? null : null
  const nodeById = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes])

  const zoom = zoomLabel === '75%' ? 0.75 : zoomLabel === '125%' ? 1.25 : 1
  const canvasW = Math.max(900, ...doc.nodes.map((n) => n.x + n.w + 80))
  const canvasH = Math.max(420, ...doc.nodes.map((n) => n.y + n.h + 80))

  function updateNode(id: string, patch: Partial<DiagramNode>) {
    stack.set((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }))
  }

  function updateEdge(id: string, patch: Partial<DiagramEdge>) {
    stack.set((d) => ({
      ...d,
      edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  }

  function handleAddNode() {
    const label = newNodeLabel.trim() || `Step ${doc.nodes.length + 1}`
    let num = doc.nodes.length + 1
    while (doc.nodes.some((n) => n.id === `N${num}`)) num++
    const id = `N${num}`
    const x = snap(60 + ((doc.nodes.length * 40) % 480), snapGrid)
    const y = snap(60 + ((doc.nodes.length * 30) % 240), snapGrid)
    const node: DiagramNode = {
      id,
      label,
      shape: newNodeShape,
      tone: 'default',
      x,
      y,
      w: 150,
      h: newNodeShape === 'decision' ? 72 : 60,
    }
    stack.set((d) => ({ ...d, nodes: [...d.nodes, node] }))
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
    setNewNodeLabel('')
    setNotice(`Added node ${id}`)
  }

  function handleDeleteNode(id: string) {
    stack.set((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => n.id !== id),
      edges: d.edges.filter((e) => e.from !== id && e.to !== id),
    }))
    if (selectedNodeId === id) setSelectedNodeId(null)
    setNotice(`Deleted node ${id}`)
  }

  function handleAddEdge(fromId: string, toId: string, label: string) {
    if (!fromId || !toId || fromId === toId) {
      setErrorMsg('Choose two distinct nodes to connect.')
      return
    }
    setErrorMsg(null)
    let num = doc.edges.length + 1
    while (doc.edges.some((e) => e.id === `E${num}`)) num++
    const edge: DiagramEdge = { id: `E${num}`, from: fromId, to: toId, label: label.trim() }
    stack.set((d) => ({ ...d, edges: [...d.edges, edge] }))
    setSelectedEdgeId(edge.id)
    setSelectedNodeId(null)
    setNewEdgeLabel('')
    setNotice(`Connected ${fromId} to ${toId}`)
  }

  function handleDeleteEdge(id: string) {
    stack.set((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }))
    if (selectedEdgeId === id) setSelectedEdgeId(null)
    setNotice(`Deleted connector ${id}`)
  }

  function handleNodePointerDown(e: PointerEvent<SVGGElement>, node: DiagramNode) {
    e.stopPropagation()
    if (connectFrom) {
      if (connectFrom !== node.id) {
        handleAddEdge(connectFrom, node.id, '')
      }
      setConnectFrom(null)
      return
    }
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    dragRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
    }
  }

  function handleCanvasPointerMove(e: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = (e.clientX - drag.startX) / zoom
    const dy = (e.clientY - drag.startY) / zoom
    const nx = Math.max(20, snap(drag.origX + dx, snapGrid))
    const ny = Math.max(20, snap(drag.origY + dy, snapGrid))
    stack.set((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === drag.id ? { ...n, x: nx, y: ny } : n)),
    }))
  }

  function handleCanvasPointerUp() {
    dragRef.current = null
  }

  function handleApplyMermaid() {
    const parsed = fromMermaid(mermaidDraft)
    if (!parsed.ok) {
      setErrorMsg(parsed.error)
      return
    }
    setErrorMsg(null)
    stack.set(parsed.doc)
    setSelectedNodeId(parsed.doc.nodes[0]?.id ?? null)
    setSelectedEdgeId(null)
    setNotice(`Imported ${parsed.doc.nodes.length} nodes from Mermaid`)
  }

  function handleExportSvg() {
    if (!svgRef.current) return
    const xml = new XMLSerializer().serializeToString(svgRef.current)
    saveText(xml, { filename: 'diagram.svg', mimeType: 'image/svg+xml;charset=utf-8' })
    setNotice('Exported diagram.svg')
  }

  function handleExportMermaid() {
    saveText(toMermaid(doc), { filename: 'diagram.mmd', mimeType: 'text/plain;charset=utf-8' })
    setNotice('Exported diagram.mmd')
  }

  function handleExportJson() {
    saveJSON(doc, { filename: 'diagram.json' })
    setNotice('Exported diagram.json')
  }

  async function handleImportJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const res = await openFile(file, 'json')
    if (!res.ok) {
      setErrorMsg(`Could not import JSON: ${res.error}`)
      return
    }
    const data = res.data as Partial<DiagramDoc>
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      setErrorMsg('File is not a valid Diagram Studio JSON file.')
      return
    }
    stack.set({
      title: typeof data.title === 'string' ? data.title : 'Imported Diagram',
      nodes: data.nodes,
      edges: data.edges,
    })
    setSelectedNodeId(data.nodes[0]?.id ?? null)
    setErrorMsg(null)
    setNotice(`Imported ${data.nodes.length} nodes`)
  }

  function handleLoadTemplate() {
    const next = createDiagramTemplate(templateChoice)
    stack.set(next)
    setSelectedNodeId(next.nodes[0]?.id ?? null)
    setSelectedEdgeId(null)
    setConnectFrom(null)
    setErrorMsg(null)
    setNotice(`Loaded ${next.title}`)
  }

  const statusText = [
    notice,
    connectFrom ? `Select target node to connect from ${connectFrom}` : '',
    `${doc.nodes.length} nodes · ${doc.edges.length} connectors`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AppShell
      name="Diagram Studio"
      icon="design"
      hue="rust"
      category="Productivity"
      meta={`${doc.title} · ${doc.nodes.length} nodes`}
      status={statusText}
      actions={
        <Actions>
          <Button kind="secondary" onClick={() => stack.undo()} disabled={!stack.canUndo}>Undo</Button>
          <Button kind="secondary" onClick={() => stack.redo()} disabled={!stack.canRedo}>Redo</Button>
          <Button kind="secondary" onClick={handleExportSvg}>Export SVG</Button>
          <Button kind="secondary" onClick={handleExportMermaid}>Export Mermaid</Button>
          <Button kind="secondary" onClick={handleExportJson}>Export JSON</Button>
        </Actions>
      }
      side={
        <>
          <Rail
            title="Inspector"
            note={selectedNode ? selectedNode.id : selectedEdge ? selectedEdge.id : 'None'}
          >
            {selectedNode ? (
              <div className="ds-rail-stack">
                <TextInput
                  label="Node label"
                  value={selectedNode.label}
                  onChange={(v) => updateNode(selectedNode.id, { label: v })}
                />
                <Select
                  label="Shape"
                  value={selectedNode.shape}
                  onChange={(v) => updateNode(selectedNode.id, { shape: v as NodeShape })}
                  options={SHAPE_OPTIONS}
                />
                <Select
                  label="Stroke tone"
                  value={selectedNode.tone}
                  onChange={(v) => updateNode(selectedNode.id, { tone: v as NodeTone })}
                  options={TONE_OPTIONS}
                />
                <Actions>
                  <Button
                    kind="secondary"
                    onClick={() =>
                      setConnectFrom(connectFrom === selectedNode.id ? null : selectedNode.id)
                    }
                  >
                    {connectFrom === selectedNode.id ? 'Cancel link' : 'Connect from here'}
                  </Button>
                  <Button kind="danger" onClick={() => handleDeleteNode(selectedNode.id)}>
                    Delete node
                  </Button>
                </Actions>
              </div>
            ) : selectedEdge ? (
              <div className="ds-rail-stack">
                <TextInput
                  label="Connector label"
                  value={selectedEdge.label}
                  onChange={(v) => updateEdge(selectedEdge.id, { label: v })}
                />
                <Button kind="danger" onClick={() => handleDeleteEdge(selectedEdge.id)}>
                  Delete connector
                </Button>
              </div>
            ) : (
              <EmptyState
                mono="No selection"
                title="Select a node or edge"
                detail="Click any shape or connector on the canvas to edit its properties."
                actionLabel="Add a node"
                onAction={handleAddNode}
              />
            )}
          </Rail>

          <Rail title="Templates">
            <div className="ds-rail-stack">
              <Select
                label="Diagram template"
                value={templateChoice}
                onChange={(v) => setTemplateChoice(v as DiagramTemplateId)}
                options={DIAGRAM_TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
              />
              <Button kind="secondary" onClick={handleLoadTemplate}>Load template</Button>
              <Button kind="ghost" onClick={() => jsonInputRef.current?.click()}>Import JSON</Button>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                aria-label="Import diagram JSON"
                className="ds-file-hidden"
                onChange={handleImportJson}
              />
            </div>
          </Rail>

          <Rail title="Connectors" note={`${doc.edges.length} links`}>
            <List label="Diagram connectors">
              {doc.edges.map((e) => (
                <Row
                  key={e.id}
                  title={`${e.from} → ${e.to}`}
                  meta={e.label || 'unlabeled'}
                  hot={e.id === selectedEdgeId}
                  onClick={() => {
                    setSelectedEdgeId(e.id)
                    setSelectedNodeId(null)
                  }}
                />
              ))}
            </List>
          </Rail>

          <Rail title="Tips">
            <Keys
              items={[
                ['Drag', 'Move node'],
                ['Snap', '20-unit grid'],
                ['Auto LR/TD', 'Tidy layout'],
              ]}
            />
          </Rail>
        </>
      }
    >
      {errorMsg && <ErrorState title="Diagram error" detail={errorMsg} />}

      <Card mono="Canvas" title={doc.title}>
        <div className="ds-toolbar" role="toolbar" aria-label="Canvas controls">
          <Button
            kind="secondary"
            onClick={() => {
              stack.set((d) => autoLayout(d, 'LR'))
              setNotice('Auto-laid out left-to-right')
            }}
          >
            Auto-layout LR
          </Button>
          <Button
            kind="secondary"
            onClick={() => {
              stack.set((d) => autoLayout(d, 'TD'))
              setNotice('Auto-laid out top-down')
            }}
          >
            Auto-layout TD
          </Button>
          <Checkbox label="Snap to grid" checked={snapGrid} onChange={setSnapGrid} />
          <Pills items={ZOOM_LABELS} active={zoomLabel} onSelect={setZoomLabel} />
        </div>

        <div className="ds-canvas-wrap" tabIndex={0} role="region" aria-label="Diagram canvas viewport">
          <svg
            ref={svgRef}
            className="ds-svg"
            width={Math.round(canvasW * zoom)}
            height={Math.round(canvasH * zoom)}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            role="img"
            aria-label={`${doc.title} flowchart canvas`}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onClick={() => {
              setSelectedNodeId(null)
              setSelectedEdgeId(null)
              setConnectFrom(null)
            }}
          >
            <defs>
              <pattern
                id="ds-grid-pattern"
                width={GRID_STEP}
                height={GRID_STEP}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={2} cy={2} r={1} className="ds-grid-dot" />
              </pattern>
              <marker
                id="ds-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" className="ds-edge-arrow" />
              </marker>
            </defs>

            <rect x={0} y={0} width={canvasW} height={canvasH} fill="url(#ds-grid-pattern)" />

            {/* Edges */}
            {doc.edges.map((edge) => {
              const a = nodeById.get(edge.from)
              const b = nodeById.get(edge.to)
              if (!a || !b) return null
              const ax = a.x + a.w / 2
              const ay = a.y + a.h / 2
              const bx = b.x + b.w / 2
              const by = b.y + b.h / 2
              const dx = bx - ax
              const dy = by - ay
              let x1 = ax
              let y1 = ay
              let x2 = bx
              let y2 = by
              if (Math.abs(dx) >= Math.abs(dy)) {
                x1 = dx >= 0 ? a.x + a.w : a.x
                x2 = dx >= 0 ? b.x : b.x + b.w
              } else {
                y1 = dy >= 0 ? a.y + a.h : a.y
                y2 = dy >= 0 ? b.y : b.y + b.h
              }
              const mx = (x1 + x2) / 2
              const my = (y1 + y2) / 2
              const dPath = `M ${x1} ${y1} Q ${mx} ${y1} ${mx} ${my} T ${x2} ${y2}`
              const isSel = edge.id === selectedEdgeId

              return (
                <g
                  key={edge.id}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setSelectedEdgeId(edge.id)
                    setSelectedNodeId(null)
                  }}
                >
                  <path
                    d={dPath}
                    className={`ds-edge-line${isSel ? ' selected' : ''}`}
                    markerEnd="url(#ds-arrow)"
                  />
                  {edge.label && (
                    <g>
                      <rect
                        x={mx - Math.max(24, edge.label.length * 4 + 10)}
                        y={my - 10}
                        width={Math.max(48, edge.label.length * 8 + 20)}
                        height={20}
                        rx={2}
                        className="ds-edge-pill"
                      />
                      <text x={mx} y={my + 4} className="ds-edge-text">{edge.label}</text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {doc.nodes.map((node) => {
              const isSel = node.id === selectedNodeId
              const isSrc = node.id === connectFrom
              const cls = [
                'ds-node-shape',
                `tone-${node.tone}`,
                isSel ? 'selected' : '',
                isSrc ? 'connect-source' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <g
                  key={node.id}
                  data-node={node.id}
                  className="ds-node-group"
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderNodeShape(node, cls)}
                  <text x={node.x + 8} y={node.y + 14} className="ds-node-id">{node.id}</text>
                  <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 5} className="ds-node-label">
                    {node.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </Card>

      <Card mono="Build" title="Add Node or Connector">
        <FormGrid>
          <TextInput
            label="New node label"
            placeholder="e.g. Cache Lookup"
            value={newNodeLabel}
            onChange={setNewNodeLabel}
          />
          <Select
            label="New node shape"
            value={newNodeShape}
            onChange={(v) => setNewNodeShape(v as NodeShape)}
            options={SHAPE_OPTIONS}
          />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={handleAddNode}>Add node</PrimaryButton>
        </Actions>

        <FormGrid>
          <Select
            label="From node"
            value={newEdgeFrom}
            onChange={setNewEdgeFrom}
            options={doc.nodes.map((n) => ({ value: n.id, label: `${n.id}: ${n.label}` }))}
          />
          <Select
            label="To node"
            value={newEdgeTo}
            onChange={setNewEdgeTo}
            options={doc.nodes.map((n) => ({ value: n.id, label: `${n.id}: ${n.label}` }))}
          />
          <TextInput
            label="New connector label"
            placeholder="e.g. Cache hit"
            value={newEdgeLabel}
            onChange={setNewEdgeLabel}
          />
        </FormGrid>
        <Actions>
          <Button kind="secondary" onClick={() => handleAddEdge(newEdgeFrom, newEdgeTo, newEdgeLabel)}>
            Add connector
          </Button>
        </Actions>
      </Card>

      <Card mono="Mermaid" title="Mermaid Flowchart Sync">
        <TextInput
          label="Mermaid source"
          rows={6}
          value={mermaidDraft}
          onChange={setMermaidDraft}
        />
        <Actions>
          <Button kind="secondary" onClick={handleApplyMermaid}>Import Mermaid</Button>
          <Button
            kind="ghost"
            onClick={() => {
              void clipboard.copy(mermaidDraft)
              setNotice('Copied Mermaid to clipboard')
            }}
          >
            {clipboard.copied ? 'Copied' : 'Copy Mermaid'}
          </Button>
        </Actions>
      </Card>
    </AppShell>
  )
}
