// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Persistence goes through @lacuna/host-mock (localStorage-backed, safe against corrupt/missing storage).
import { createMockValue } from '@lacuna/host-mock'
import type { DrawingState, DrawingStore } from './index'
import { DEFAULT_HEX } from '../colors'

const STORAGE_KEY = 'lacuna.drawing-app.state'

const DEFAULT_STATE: DrawingState = {
  layers: [{ name: 'Layer 1', strokes: [] }],
  selected: 'Layer 1',
  hex: DEFAULT_HEX,
}

function isDrawingState(v: unknown): v is DrawingState {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false
  const s = v as DrawingState
  if (!Array.isArray(s.layers)) return false
  if (s.selected !== null && typeof s.selected !== 'string') return false
  if (typeof s.hex !== 'string') return false
  return true
}

export const mockStore: DrawingStore = (() => {
  const value = createMockValue<DrawingState>({
    key: STORAGE_KEY,
    fallback: DEFAULT_STATE,
    validate: isDrawingState,
  })

  return {
    read(): DrawingState {
      return value.get()
    },
    write(state: DrawingState): void {
      value.set(state)
    },
  }
})()
