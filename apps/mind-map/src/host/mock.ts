// localStorage-backed mock of the host records API for mind-map records.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface MapNode {
  id: string
  label: string
  x: number
  y: number
}

export interface MapEdge {
  id: string
  from: string
  to: string
}

export interface StrokePoint {
  x: number
  y: number
  pressure: number
}

export interface MapStroke {
  id: string
  points: StrokePoint[]
  color: string
  width: number
}

export interface MindMapRecord {
  id: string
  nodes: MapNode[]
  edges: MapEdge[]
  strokes: MapStroke[]
  savedAt: string
}

export function isMindMapRecord(value: unknown): value is MindMapRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  if (typeof r.id !== 'string') return false
  if (!Array.isArray(r.nodes) || !Array.isArray(r.edges) || !Array.isArray(r.strokes)) return false
  return r.nodes.every(isNode) && r.edges.every(isEdge) && r.strokes.every(isStroke)
}

function isNode(v: unknown): v is MapNode {
  if (typeof v !== 'object' || v === null) return false
  const n = v as Record<string, unknown>
  return (
    typeof n.id === 'string' &&
    typeof n.label === 'string' &&
    typeof n.x === 'number' &&
    typeof n.y === 'number'
  )
}

function isEdge(v: unknown): v is MapEdge {
  if (typeof v !== 'object' || v === null) return false
  const e = v as Record<string, unknown>
  return typeof e.id === 'string' && typeof e.from === 'string' && typeof e.to === 'string'
}

function isStroke(v: unknown): v is MapStroke {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    Array.isArray(s.points) &&
    typeof s.color === 'string' &&
    typeof s.width === 'number'
  )
}

const store = createMockRecordStore<MindMapRecord>({
  key: 'lacuna.mind-map.record',
  validate: isMindMapRecord,
  idPrefix: 'map-',
})

export const MAP_ID = 'map-mind-map'

export function loadMindMap(): MindMapRecord | null {
  return store.get(MAP_ID) ?? null
}

export function saveMindMap(record: Omit<MindMapRecord, 'id' | 'savedAt'>): MindMapRecord {
  const full: MindMapRecord = { ...record, id: MAP_ID, savedAt: new Date().toISOString() }
  const existing = store.get(MAP_ID)
  if (existing) {
    store.update(MAP_ID, full)
  } else {
    store.add(full)
  }
  return full
}
