// Mock host persistence. In the sandbox this would call the host API; here the
// same shapes round-trip through localStorage under one key.
import { useLocalRecord } from '@lacuna/use-local-record'

export interface Stroke {
  id: string
  layer: number
  tool: 'brush' | 'eraser'
  color: string
  size: number
  points: { x: number; y: number }[]
}

export interface Layer {
  id: number
  name: string
  visible: boolean
}

export interface BoardRecord {
  strokes: Stroke[]
  layers: Layer[]
  activeLayer: number
  tool: 'brush' | 'eraser'
  color: string
  size: number
  zoom: number
}

export const BOARD_DEFAULT: BoardRecord = {
  strokes: [],
  layers: [{ id: 1, name: 'Layer 1', visible: true }],
  activeLayer: 1,
  tool: 'brush',
  color: 'black',
  size: 4,
  zoom: 100,
}

export function useBoard() {
  return useLocalRecord<BoardRecord>({
    key: 'lacuna.whiteboard.board',
    version: 1,
    defaultValue: BOARD_DEFAULT,
  })
}

export function nextLayerId(layers: Layer[]): number {
  return layers.reduce((max, layer) => Math.max(max, layer.id), 0) + 1
}

export function layerName(id: number): string {
  return `Layer ${id}`
}
