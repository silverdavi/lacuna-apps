// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// localStorage-backed mock store for the SVG editor document, built on @lacuna/host-mock.
import { createMockValue } from '@lacuna/host-mock'

export interface Point {
  x: number
  y: number
}

export interface Shape {
  id: string
  kind: 'path' | 'rect' | 'ellipse'
  points?: Point[]
  x?: number
  y?: number
  w?: number
  h?: number
  strokeWidth: number
}

export interface Layer {
  id: string
  name: string
  shapes: Shape[]
}

export interface DocState {
  layers: Layer[]
  selectedLayerId: string | null
  width: number
  height: number
  strokeWidth: number
}

const KEY = 'lacuna.svg-editor.doc'

export const DEFAULT_STATE: DocState = {
  layers: [],
  selectedLayerId: null,
  width: 480,
  height: 360,
  strokeWidth: 5,
}

function isDoc(value: unknown): value is DocState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<DocState>
  if (!Array.isArray(v.layers)) return false
  if (typeof v.selectedLayerId !== 'string' && v.selectedLayerId !== null) return false
  if (typeof v.width !== 'number' || typeof v.height !== 'number' || typeof v.strokeWidth !== 'number') return false
  return v.layers.every(
    (l) =>
      typeof l === 'object' &&
      l !== null &&
      typeof (l as { id?: unknown }).id === 'string' &&
      typeof (l as { name?: unknown }).name === 'string' &&
      Array.isArray((l as { shapes?: unknown }).shapes),
  )
}

const store = createMockValue<DocState>({
  key: KEY,
  fallback: DEFAULT_STATE,
  validate: isDoc,
})

export function loadDoc(): DocState {
  return store.get()
}

export function saveDoc(state: DocState): void {
  store.set(state)
}
