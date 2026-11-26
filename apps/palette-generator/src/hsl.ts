import { hslToRgb, rgbToHex } from '@lacuna/color-math'

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))

export function hslFieldToHex(h: number, s: number, l: number): string {
  const hNorm = clamp(h, 0, 360) / 360
  const sNorm = clamp(s, 0, 100) / 100
  const lNorm = clamp(l, 0, 100) / 100
  const rgb = hslToRgb({ h: hNorm, s: sNorm, l: lNorm })
  return up(rgbToHex(rgb))
}

function up(hex: string): string {
  return hex.toUpperCase()
}
