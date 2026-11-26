// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockValue } from '@lacuna/host-mock'
import type { SketchState, SketchStore } from './index'

const KEY = 'lacuna.drawing.sketch'

const DEFAULT: SketchState = {
  layers: [],
  selected: null,
}

function isSketch(value: unknown): value is SketchState {
  const v = value as Partial<SketchState>
  return (
    typeof v === 'object' &&
    v !== null &&
    Array.isArray(v.layers) &&
    v.layers.every(
      (l) =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as { name?: unknown }).name === 'string' &&
        Array.isArray((l as { strokes?: unknown[] }).strokes),
    ) &&
    (v.selected === null || typeof v.selected === 'string')
  )
}

export const mockStore: SketchStore = (() => {
  const value = createMockValue<SketchState>({
    key: KEY,
    fallback: DEFAULT,
    validate: isSketch,
  })
  return {
    read() {
      return value.get()
    },
    write(state: SketchState) {
      value.set(state)
    },
  }
})()
