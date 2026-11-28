// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface ColorBreakdown {
  rgb: Rgb
  hex: string
  rgbCss: string
  hslCss: string
  hsvCss: string
  cmykCss: string
  oklchCss: string
  contrastWhite: number
  contrastBlack: number
}

const HASH = String.fromCharCode(35)

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function parseColorString(raw: string): Rgb {
  const s = raw.trim()
  const hexMatch = s.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (hexMatch) {
    let h = hexMatch[1]!
    if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }

  const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/i)
  if (rgbMatch) {
    return {
      r: clamp255(Number(rgbMatch[1])),
      g: clamp255(Number(rgbMatch[2])),
      b: clamp255(Number(rgbMatch[3])),
    }
  }

  const hslMatch = s.match(/^hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?/i)
  if (hslMatch) {
    return hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]))
  }

  throw new Error('Enter a valid HEX, rgb(r, g, b), or hsl(h, s%, l%) color')
}

function hslToRgb(h: number, sPct: number, lPct: number): Rgb {
  const s = Math.max(0, Math.min(100, sPct)) / 100
  const l = Math.max(0, Math.min(100, lPct)) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  const hh = ((h % 360) + 360) % 360
  if (hh < 60) [r, g, b] = [c, x, 0]
  else if (hh < 120) [r, g, b] = [x, c, 0]
  else if (hh < 180) [r, g, b] = [0, c, x]
  else if (hh < 240) [r, g, b] = [0, x, c]
  else if (hh < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: clamp255((r + m) * 255), g: clamp255((g + m) * 255), b: clamp255((b + m) * 255) }
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b)
}

function rgbToOklch(rgb: Rgb): { l: number; c: number; h: number } {
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const C = Math.sqrt(a * a + bb * bb)
  let H = (Math.atan2(bb, a) * 180) / Math.PI
  if (H < 0) H += 360
  return { l: L, c: C, h: H }
}

export function describeColor(rgb: Rgb): ColorBreakdown {
  const hex =
    HASH +
    [rgb.r, rgb.g, rgb.b]
      .map((n) => clamp255(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()

  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  const l = (max + min) / 2
  const sHsl = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  const sHsv = max === 0 ? 0 : d / max

  const k = 1 - max
  const c = k === 1 ? 0 : (1 - r - k) / (1 - k)
  const m = k === 1 ? 0 : (1 - g - k) / (1 - k)
  const y = k === 1 ? 0 : (1 - b - k) / (1 - k)

  const ok = rgbToOklch(rgb)
  const lum = relativeLuminance(rgb)
  const contrastWhite = Number(((1.05) / (lum + 0.05)).toFixed(2))
  const contrastBlack = Number(((lum + 0.05) / 0.05).toFixed(2))

  return {
    rgb,
    hex,
    rgbCss: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hslCss: `hsl(${Math.round(h)}, ${Math.round(sHsl * 100)}%, ${Math.round(l * 100)}%)`,
    hsvCss: `hsv(${Math.round(h)}, ${Math.round(sHsv * 100)}%, ${Math.round(max * 100)}%)`,
    cmykCss: `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`,
    oklchCss: `oklch(${(ok.l * 100).toFixed(1)}% ${ok.c.toFixed(3)} ${ok.h.toFixed(1)})`,
    contrastWhite,
    contrastBlack,
  }
}

export function exportPaletteCss(swatches: Array<{ name: string; hex: string }>): string {
  const lines = swatches.map(
    (s) => `  --color-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}: ${s.hex};`,
  )
  return `:root {\n${lines.join('\n')}\n}\n`
}

export function exportPaletteTailwind(swatches: Array<{ name: string; hex: string }>): string {
  const colors: Record<string, string> = {}
  for (const s of swatches) {
    colors[s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')] = s.hex
  }
  return JSON.stringify({ theme: { extend: { colors } } }, null, 2)
}
