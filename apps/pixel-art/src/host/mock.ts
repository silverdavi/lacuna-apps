// Local session store for the Pixel Art Editor. Backed by the host-mock
// value store, which persists to localStorage so a reload keeps the layers
// and the painted pixels. No data leaves this device.

import { createMockValue } from '@lacuna/host-mock'

export interface Layer {
  id: string
  name: string
  /** 256 entries: hex string for painted pixels, null for empty. */
  pixels: (string | null)[]
}

export interface EditorState {
  layers: Layer[]
  selectedLayerId: string
}

const STATE_KEY = 'lacuna.pixel-art.state.v1'

export const EMPTY_STATE: EditorState = {
  layers: [{ id: 'l1', name: 'Layer 1', pixels: new Array(256).fill(null) }],
  selectedLayerId: 'l1',
}

function isEditorState(v: unknown): v is EditorState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (!Array.isArray(s.layers) || !s.layers.length) return false
  if (typeof s.selectedLayerId !== 'string') return false
  return (s.layers as unknown[]).every((l) => {
    if (typeof l !== 'object' || l === null) return false
    const r = l as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.name !== 'string') return false
    if (!Array.isArray(r.pixels) || r.pixels.length !== 256) return false
    return r.pixels.every((p) => p === null || typeof p === 'string')
  })
}

const store = createMockValue<EditorState>({
  key: STATE_KEY,
  fallback: EMPTY_STATE,
  validate: isEditorState,
})

export function loadState(): EditorState {
  return store.get()
}

export function saveState(state: EditorState): void {
  store.set(state)
}
