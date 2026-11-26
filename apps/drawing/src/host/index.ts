// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
export interface StrokePoint {
  x: number
  y: number
}

export interface Stroke {
  id: string
  color: string
  size: number
  points: StrokePoint[]
}

export interface Layer {
  name: string
  strokes: Stroke[]
}

export interface SketchState {
  layers: Layer[]
  selected: string | null
}

export interface SketchStore {
  read(): SketchState
  write(state: SketchState): void
}
