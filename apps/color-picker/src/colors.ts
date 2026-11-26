// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/app-color-picker: default colors are derived from channel values, never written as hex literals.

export interface Rgb {
  r: number
  g: number
  b: number
}

function clampByte(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}

export function rgbToHexStr(r: number, g: number, b: number): string {
  const to = (n: number) => clampByte(n).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export const DEFAULT_FOREGROUND: Rgb = { r: 255, g: 87, b: 51 }
export const DEFAULT_BACKGROUND: Rgb = { r: 248, g: 248, b: 248 }

export const DEFAULT_FOREGROUND_HEX = rgbToHexStr(DEFAULT_FOREGROUND.r, DEFAULT_FOREGROUND.g, DEFAULT_FOREGROUND.b)
export const DEFAULT_BACKGROUND_HEX = rgbToHexStr(DEFAULT_BACKGROUND.r, DEFAULT_BACKGROUND.g, DEFAULT_BACKGROUND.b)

export function swatchBackground(r: number, g: number, b: number): string {
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`
}
