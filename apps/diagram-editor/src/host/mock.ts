// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'

export type Shape = {
  id: string
  kind: 'rectangle' | 'ellipse'
  x: number
  y: number
  w: number
  h: number
  label: string
  color: string
}

const isShape = (value: unknown): value is Shape => {
  const v = value as Shape
  return (
    Boolean(v) &&
    typeof v.id === 'string' &&
    (v.kind === 'rectangle' || v.kind === 'ellipse') &&
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.w === 'number' &&
    typeof v.h === 'number' &&
    typeof v.label === 'string' &&
    typeof v.color === 'string'
  )
}

export const shapesStore: MockRecordStore<Shape> = createMockRecordStore<Shape>({
  key: 'lacuna.diagram-editor.shapes',
  validate: isShape,
})
