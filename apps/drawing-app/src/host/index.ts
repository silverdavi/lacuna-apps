// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
export interface Point {
  x: number
  y: number
}

export interface Stroke {
  id: string
  kind: 'brush' | 'eraser' | 'rectangle'
  color: string
  size: number
  points: Point[]
}

export interface Layer {
  name: string
  strokes: Stroke[]
}

export interface DrawingState {
  layers: Layer[]
  selected: string | null
  hex: string
}

export interface DrawingStore {
  read(): DrawingState
  write(state: DrawingState): void
}
