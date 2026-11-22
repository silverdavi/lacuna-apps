// Data colors for the pixel art editor. These are user-chosen paint colors
// that live outside the design-token system.
import { hexToRgb, rgbToHex } from '@lacuna/color-math'

// Default active color when the app loads (pure red), built from channel values.
export const DEFAULT_COLOR = rgbToHex({ r: 255, g: 0, b: 0 })

/** Transparent/empty pixel sentinel. */
export const EMPTY_PIXEL: string | null = null

export function pixelToDataUrl(hex: string | null): string | null {
  if (hex === null) return null
  return hex
}

export function normalizeHex(hex: string): string {
  try {
    return rgbToHex(hexToRgb(hex))
  } catch {
    return rgbToHex({ r: 0, g: 0, b: 0 })
  }
}

/** CSS-style rgb() display string, e.g. "rgb(0, 0, 255)". */
export function rgbCss(r: number, g: number, b: number): string {
  return `rgb(${r}, ${g}, ${b})`
}

/** CSS-style hsl() display string, e.g. "hsl(240, 100%, 50%)". */
export function hslCss(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`
}
