// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
export type NodeShape = 'process' | 'decision' | 'terminal' | 'database' | 'note'
export type NodeTone = 'default' | 'accent' | 'cobalt' | 'green' | 'gold'

export interface DiagramNode {
  id: string
  label: string
  shape: NodeShape
  tone: NodeTone
  x: number
  y: number
  w: number
  h: number
}

export interface DiagramEdge {
  id: string
  from: string
  to: string
  label: string
}

export interface DiagramDoc {
  title: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export type DiagramTemplateId = 'api' | 'incident' | 'order'

export const DIAGRAM_TEMPLATES: { id: DiagramTemplateId; label: string }[] = [
  { id: 'api', label: 'API Request Flow' },
  { id: 'incident', label: 'Incident Triage' },
  { id: 'order', label: 'Order Pipeline' },
]

export const GRID_STEP = 20

export function snap(n: number, enabled: boolean): number {
  return enabled ? Math.round(n / GRID_STEP) * GRID_STEP : Math.round(n)
}

export function autoLayout(doc: DiagramDoc, direction: 'LR' | 'TD'): DiagramDoc {
  const inDeg = new Map<string, number>()
  const outs = new Map<string, string[]>()
  for (const n of doc.nodes) {
    inDeg.set(n.id, 0)
    outs.set(n.id, [])
  }
  for (const e of doc.edges) {
    if (inDeg.has(e.to) && outs.has(e.from) && e.from !== e.to) {
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1)
      outs.get(e.from)!.push(e.to)
    }
  }
  const layer = new Map<string, number>()
  const queue: string[] = []
  for (const n of doc.nodes) {
    if ((inDeg.get(n.id) ?? 0) === 0) {
      queue.push(n.id)
      layer.set(n.id, 0)
    }
  }
  while (queue.length > 0) {
    const id = queue.shift()!
    const curL = layer.get(id) ?? 0
    for (const next of outs.get(id) ?? []) {
      const nextL = Math.max(layer.get(next) ?? 0, curL + 1)
      layer.set(next, nextL)
      const rem = (inDeg.get(next) ?? 1) - 1
      inDeg.set(next, rem)
      if (rem === 0) queue.push(next)
    }
  }
  for (const n of doc.nodes) {
    if (!layer.has(n.id)) layer.set(n.id, 0)
  }

  const buckets = new Map<number, DiagramNode[]>()
  for (const n of doc.nodes) {
    const l = layer.get(n.id) ?? 0
    const arr = buckets.get(l) ?? []
    arr.push(n)
    buckets.set(l, arr)
  }

  const nextPos = new Map<string, { x: number; y: number }>()
  for (const [l, nodes] of buckets.entries()) {
    nodes.forEach((n, idx) => {
      if (direction === 'LR') {
        nextPos.set(n.id, { x: 40 + l * 220, y: 40 + idx * 120 })
      } else {
        nextPos.set(n.id, { x: 60 + idx * 200, y: 40 + l * 130 })
      }
    })
  }

  return {
    ...doc,
    nodes: doc.nodes.map((n) => {
      const p = nextPos.get(n.id)
      return p ? { ...n, x: p.x, y: p.y } : n
    }),
  }
}

export function toMermaid(doc: DiagramDoc): string {
  const lines: string[] = ['flowchart LR']
  for (const n of doc.nodes) {
    const safe = n.label.replace(/"/g, "'")
    let decl = `${n.id}["${safe}"]`
    if (n.shape === 'decision') decl = `${n.id}{"${safe}"}`
    else if (n.shape === 'terminal') decl = `${n.id}(["${safe}"])`
    else if (n.shape === 'database') decl = `${n.id}[("${safe}")]`
    else if (n.shape === 'note') decl = `${n.id}[/"${safe}"/]`
    lines.push(`  ${decl}`)
  }
  for (const e of doc.edges) {
    const lbl = e.label.trim()
    lines.push(lbl ? `  ${e.from} -->|${lbl}| ${e.to}` : `  ${e.from} --> ${e.to}`)
  }
  return lines.join('\n')
}

function parseNodeToken(raw: string): { id: string; label?: string; shape?: NodeShape } | null {
  const s = raw.trim()
  if (!s) return null
  let m: RegExpExecArray | null
  if ((m = /^([A-Za-z0-9_]+)\(\["?([^"\]]+)"?\]\)$/.exec(s))) {
    return { id: m[1], label: m[2].trim(), shape: 'terminal' }
  }
  if ((m = /^([A-Za-z0-9_]+)\[\("?([^")]+)"?\)\]$/.exec(s))) {
    return { id: m[1], label: m[2].trim(), shape: 'database' }
  }
  if ((m = /^([A-Za-z0-9_]+)\{\s*"?([^"}]+)"?\s*\}$/.exec(s))) {
    return { id: m[1], label: m[2].trim(), shape: 'decision' }
  }
  if ((m = /^([A-Za-z0-9_]+)\[\/"?([^"/]+)"?\/\]$/.exec(s))) {
    return { id: m[1], label: m[2].trim(), shape: 'note' }
  }
  if ((m = /^([A-Za-z0-9_]+)\["?([^"\]]+)"?\]$/.exec(s))) {
    return { id: m[1], label: m[2].trim(), shape: 'process' }
  }
  if ((m = /^([A-Za-z0-9_]+)$/.exec(s))) {
    return { id: m[1] }
  }
  return null
}

export function fromMermaid(text: string): { ok: true; doc: DiagramDoc } | { ok: false; error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'))
  if (lines.length === 0) return { ok: false, error: 'Mermaid input is empty.' }

  let direction: 'LR' | 'TD' = 'LR'
  let startIdx = 0
  const head = /^(?:flowchart|graph)\s+(LR|TD|TB|RL)/i.exec(lines[0])
  if (head) {
    direction = head[1].toUpperCase() === 'TD' || head[1].toUpperCase() === 'TB' ? 'TD' : 'LR'
    startIdx = 1
  }

  const nodeMap = new Map<string, DiagramNode>()
  const edges: DiagramEdge[] = []

  const ensureNode = (tok: { id: string; label?: string; shape?: NodeShape }) => {
    const existing = nodeMap.get(tok.id)
    if (existing) {
      if (tok.label) existing.label = tok.label
      if (tok.shape) existing.shape = tok.shape
    } else {
      nodeMap.set(tok.id, {
        id: tok.id,
        label: tok.label ?? tok.id,
        shape: tok.shape ?? 'process',
        tone: 'default',
        x: 40,
        y: 40,
        w: 150,
        h: 64,
      })
    }
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    const edgeMatch = /^(.+?)\s*--(?:>\s*\|([^|]*)\||([^>]+)->|>)\s*(.+)$/.exec(line)
    if (edgeMatch) {
      const lhs = parseNodeToken(edgeMatch[1])
      const rhs = parseNodeToken(edgeMatch[4])
      if (!lhs || !rhs) continue
      ensureNode(lhs)
      ensureNode(rhs)
      edges.push({
        id: `E${edges.length + 1}`,
        from: lhs.id,
        to: rhs.id,
        label: (edgeMatch[2] ?? edgeMatch[3] ?? '').trim(),
      })
      continue
    }
    const single = parseNodeToken(line)
    if (single) ensureNode(single)
  }

  if (nodeMap.size === 0) {
    return { ok: false, error: 'No valid Mermaid nodes or edges found.' }
  }

  const base: DiagramDoc = {
    title: 'Imported Diagram',
    nodes: [...nodeMap.values()],
    edges,
  }
  return { ok: true, doc: autoLayout(base, direction) }
}

export function createDiagramTemplate(id: DiagramTemplateId): DiagramDoc {
  if (id === 'incident') {
    return {
      title: 'Incident Triage',
      nodes: [
        { id: 'N1', label: 'Alert Fired', shape: 'terminal', tone: 'accent', x: 40, y: 140, w: 140, h: 56 },
        { id: 'N2', label: 'Customer Impact?', shape: 'decision', tone: 'gold', x: 240, y: 132, w: 160, h: 72 },
        { id: 'N3', label: 'Page On-Call', shape: 'process', tone: 'accent', x: 480, y: 40, w: 150, h: 60 },
        { id: 'N4', label: 'Log Ticket', shape: 'process', tone: 'cobalt', x: 480, y: 220, w: 150, h: 60 },
        { id: 'N5', label: 'Postmortem DB', shape: 'database', tone: 'green', x: 700, y: 140, w: 150, h: 64 },
      ],
      edges: [
        { id: 'E1', from: 'N1', to: 'N2', label: 'triage' },
        { id: 'E2', from: 'N2', to: 'N3', label: 'Yes' },
        { id: 'E3', from: 'N2', to: 'N4', label: 'No' },
        { id: 'E4', from: 'N3', to: 'N5', label: 'resolve' },
        { id: 'E5', from: 'N4', to: 'N5', label: 'archive' },
      ],
    }
  }

  if (id === 'order') {
    return {
      title: 'Order Pipeline',
      nodes: [
        { id: 'N1', label: 'Checkout', shape: 'terminal', tone: 'cobalt', x: 40, y: 120, w: 140, h: 56 },
        { id: 'N2', label: 'In Stock?', shape: 'decision', tone: 'gold', x: 240, y: 112, w: 150, h: 72 },
        { id: 'N3', label: 'Charge Card', shape: 'process', tone: 'green', x: 460, y: 40, w: 150, h: 60 },
        { id: 'N4', label: 'Backorder Queue', shape: 'note', tone: 'default', x: 460, y: 200, w: 150, h: 60 },
        { id: 'N5', label: 'Orders Ledger', shape: 'database', tone: 'cobalt', x: 680, y: 40, w: 150, h: 64 },
      ],
      edges: [
        { id: 'E1', from: 'N1', to: 'N2', label: 'verify' },
        { id: 'E2', from: 'N2', to: 'N3', label: 'Yes' },
        { id: 'E3', from: 'N2', to: 'N4', label: 'No' },
        { id: 'E4', from: 'N3', to: 'N5', label: 'commit' },
      ],
    }
  }

  return {
    title: 'API Request Flow',
    nodes: [
      { id: 'N1', label: 'Client App', shape: 'terminal', tone: 'cobalt', x: 40, y: 140, w: 140, h: 56 },
      { id: 'N2', label: 'Auth Gateway', shape: 'decision', tone: 'gold', x: 240, y: 132, w: 150, h: 72 },
      { id: 'N3', label: 'Service Worker', shape: 'process', tone: 'default', x: 460, y: 60, w: 150, h: 60 },
      { id: 'N4', label: '401 Rejected', shape: 'note', tone: 'accent', x: 460, y: 220, w: 150, h: 56 },
      { id: 'N5', label: 'Primary Store', shape: 'database', tone: 'green', x: 680, y: 60, w: 150, h: 64 },
    ],
    edges: [
      { id: 'E1', from: 'N1', to: 'N2', label: 'HTTPS' },
      { id: 'E2', from: 'N2', to: 'N3', label: 'Valid' },
      { id: 'E3', from: 'N2', to: 'N4', label: 'Denied' },
      { id: 'E4', from: 'N3', to: 'N5', label: 'SQL' },
    ],
  }
}
