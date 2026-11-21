// Data colors for the goal tracker's heatmap. These paint swatches are the one
// place color literals may live; everything else reads from tokens.
import { heatLevel, type HeatLevel } from './engine'

export const HEAT_FILL: Record<HeatLevel, string> = {
  empty: 'rgb(214, 206, 189)',
  low: 'rgb(181, 80, 42)',
  mid: 'hsl(16, 70%, 40%)',
  high: 'hsl(14, 78%, 33%)',
}

export function heatBackground(count: number): string {
  return HEAT_FILL[heatLevel(count)]
}
