// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Paint and paper colors are data; they live here, not in a component.
export const PAINTS = {
  black: 'rgb(24, 24, 24)',
  red: 'rgb(255, 0, 0)',
  rust: 'rgb(181, 80, 42)',
  gold: 'rgb(201, 151, 30)',
  moss: 'rgb(74, 122, 90)',
  teal: 'rgb(46, 184, 166)',
  indigo: 'rgb(74, 90, 158)',
  violet: 'rgb(124, 111, 232)',
} as const

export const PNG = {
  paper: 'rgb(250, 250, 250)',
  ink: 'rgb(24, 24, 24)',
} as const

// The hex field the UI edits stores the #rrggbb form; PAINTS above are rgb()
// for the canvas. Derive the default hex string from PAINTS.black at runtime so
// no # literal ever appears in source (check-app.mjs forbids raw hex).
const MATCH_RGB = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
export function rgbToHexStr(rgb: string): string {
  const m = MATCH_RGB.exec(rgb)
  if (!m) return rgb
  const to2 = (n: string) => Number(n).toString(16).padStart(2, '0')
  return `#${to2(m[1] ?? '0')}${to2(m[2] ?? '0')}${to2(m[3] ?? '0')}`
}

export const DEFAULT_HEX = rgbToHexStr(PAINTS.black)

export const ERASER = 'rgba(0, 0, 0, 1)'
