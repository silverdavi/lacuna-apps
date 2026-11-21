import { createMockValue } from '@lacuna/host-mock'

export type ShapeKind = 'rect' | 'ellipse'
export type ColorName = 'red' | 'blue' | 'green' | 'amber' | 'ink'

export interface Shape {
  id: string
  kind: ShapeKind
  x: number
  y: number
  w: number
  h: number
  label: string
  color: ColorName
}

export interface Connector {
  id: string
  from: string
  to: string
}

export interface DiagramState {
  shapes: Shape[]
  connectors: Connector[]
}

function isColor(value: unknown): value is ColorName {
  return value === 'red' || value === 'blue' || value === 'green' || value === 'amber' || value === 'ink'
}

export function isShape(value: unknown): value is Shape {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    (v.kind === 'rect' || v.kind === 'ellipse') &&
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.w === 'number' &&
    typeof v.h === 'number' &&
    typeof v.label === 'string' &&
    isColor(v.color)
  )
}

export function isConnector(value: unknown): value is Connector {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.from === 'string' && typeof v.to === 'string'
}

export function isDiagramState(value: unknown): value is DiagramState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.shapes) &&
    v.shapes.every(isShape) &&
    Array.isArray(v.connectors) &&
    v.connectors.every(isConnector)
  )
}

export const shapesStore = createMockValue<DiagramState>({
  key: 'lacuna.diagram-editor.state',
  fallback: { shapes: [], connectors: [] },
  validate: isDiagramState,
})
