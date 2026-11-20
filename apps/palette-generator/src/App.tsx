import { useEffect, useState } from 'react'
import { Body, Button, EmptyState, MonoLabel, Stack } from '@lacuna/ui'
import { host, type PaletteRecord } from './host'
import './app.css'

type Scheme = 'Complementary' | 'Analogous' | 'Triadic' | 'Monochromatic'

const SCHEMES: Scheme[] = ['Complementary', 'Analogous', 'Triadic', 'Monochromatic']

const HUE_STEPS: Record<Scheme, number[]> = {
  Complementary: [0, 120, 240, 180, 180],
  Analogous: [0, -30, 30, -60, 60],
  Triadic: [0, 120, 240, 60, 300],
  Monochromatic: [0, 0, 0, 0, 0],
}

const LIGHT_STEPS: Record<Scheme, number[]> = {
  Complementary: [0, 0, 0, 0, 0],
  Analogous: [0, 0, 0, 0, 0],
  Triadic: [0, 0, 0, 0, 0],
  Monochromatic: [0, -18, 18, -32, 32],
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const normHue = (h: number) => ((h % 360) + 360) % 360

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const p = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0').toUpperCase()
  return `#${p(r)}${p(g)}${p(b)}`
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = normHue(h)
  const sat = clamp(s, 0, 100) / 100
  const lig = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lig - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (hue < 60) {
    rp = c
    gp = x
  } else if (hue < 120) {
    rp = x
    gp = c
  } else if (hue < 180) {
    gp = c
    bp = x
  } else if (hue < 240) {
    gp = x
    bp = c
  } else if (hue < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h: normHue(h), s: s * 100, l: l * 100 }
}

function contrastAgainstWhite(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const lum = 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b)
  return (1 + 0.05) / (lum + 0.05)
}

function buildSwatches(baseHex: string, scheme: Scheme): string[] {
  const base = hexToRgb(baseHex)
  if (!base) return []
  const { h, s, l } = rgbToHsl(base.r, base.g, base.b)
  return Array.from({ length: 5 }, (_, i) => {
    const rgb = hslToRgb(h + HUE_STEPS[scheme][i], s, clamp(l + LIGHT_STEPS[scheme][i], 0, 100))
    return rgbToHex(rgb.r, rgb.g, rgb.b)
  })
}

function hexFromHslParts(hue: string, sat: string, light: string): string | null {
  if (!/^-?\d+(\.\d+)?$/.test(hue) || !/^-?\d+(\.\d+)?$/.test(sat) || !/^-?\d+(\.\d+)?$/.test(light)) return null
  const rgb = hslToRgb(Number(hue), Number(sat), Number(light))
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

function hslPartsFromHex(hex: string): { hue: string; sat: string; light: string } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return { hue: String(Math.round(h)), sat: String(Math.round(s)), light: String(Math.round(l)) }
}

export function App() {
  const [record, setRecord] = useState<PaletteRecord | null>(() => host.loadPalette())
  const [hex, setHex] = useState<string>(record?.baseHex ?? '')
  const [hue, setHue] = useState<string>(record ? hslPartsFromHex(record.baseHex)?.hue ?? '' : '')
  const [sat, setSat] = useState<string>(record ? hslPartsFromHex(record.baseHex)?.sat ?? '' : '')
  const [light, setLight] = useState<string>(record ? hslPartsFromHex(record.baseHex)?.light ?? '' : '')
  const [scheme, setScheme] = useState<Scheme>(record?.scheme === 'Analogous' ? 'Analogous' : 'Complementary')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (copiedIndex === null) return
    const id = window.setTimeout(() => setCopiedIndex(null), 2000)
    return () => window.clearTimeout(id)
  }, [copiedIndex])

  const commitRecord = (baseHex: string, sw: string[], sc: Scheme) => {
    const next: PaletteRecord = {
      id: 'palette-1',
      baseHex,
      scheme: sc,
      swatches: sw,
      savedAt: new Date().toISOString(),
    }
    setRecord(next)
    host.savePalette(next)
  }

  const onGenerate = () => {
    const base = hex.trim().toUpperCase()
    if (!hexToRgb(base)) return
    const sw = buildSwatches(base, scheme)
    if (sw.length !== 5) return
    const parts = hslPartsFromHex(base)
    if (parts) {
      setHue(parts.hue)
      setSat(parts.sat)
      setLight(parts.light)
    }
    commitRecord(base, sw, scheme)
  }

  const onHexChange = (value: string) => {
    setHex(value)
    const parts = hslPartsFromHex(value)
    if (parts) {
      setHue(parts.hue)
      setSat(parts.sat)
      setLight(parts.light)
    }
  }

  const onHslChange = (nextHue: string, nextSat: string, nextLight: string) => {
    setHue(nextHue)
    setSat(nextSat)
    setLight(nextLight)
    const nextHex = hexFromHslParts(nextHue, nextSat, nextLight)
    if (nextHex) setHex(nextHex)
  }

  const onCopy = (value: string, index: number) => {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch {
      // ignore
    }
    document.body.removeChild(ta)
    setCopiedIndex(index)
  }

  const onRemove = (index: number) => {
    if (!record) return
    const sw = record.swatches.filter((_, i) => i !== index)
    commitRecord(record.baseHex, sw, record.scheme as Scheme)
  }

  return (
    <main className="pal-app">
      <div className="lc-card flush">
        <Stack>
          <div className="pal-head">
            <MonoLabel sm>Studio</MonoLabel>
            <h1 className="pal-title">Color Palette</h1>
          </div>
          <Body>
            Pick a base color and a harmony scheme, then generate a row of swatches. Copy any hex, remove a
            swatch, or switch color with the hue, saturation, and lightness fields. The active palette survives a
            reload.
          </Body>
          <div className="pal-controls">
            <div className="pal-field">
              <label className="pal-label" htmlFor="pal-hex">
                Hex
              </label>
              <input
                id="pal-hex"
                className="pal-input"
                value={hex}
                placeholder="e.g. base color"
                aria-label="Hex"
                onChange={(e) => onHexChange(e.target.value)}
              />
            </div>
            <div className="pal-field">
              <label className="pal-label" htmlFor="pal-scheme">
                Scheme
              </label>
              <select
                id="pal-scheme"
                className="pal-input"
                value={scheme}
                aria-label="Scheme"
                onChange={(e) => setScheme(e.target.value as Scheme)}
              >
                {SCHEMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="pal-field">
              <label className="pal-label" htmlFor="pal-hue">
                Hue
              </label>
              <input
                id="pal-hue"
                className="pal-input"
                type="number"
                inputMode="numeric"
                value={hue}
                aria-label="Hue"
                onChange={(e) => onHslChange(e.target.value, sat, light)}
              />
            </div>
            <div className="pal-field">
              <label className="pal-label" htmlFor="pal-sat">
                Saturation
              </label>
              <input
                id="pal-sat"
                className="pal-input"
                type="number"
                inputMode="numeric"
                value={sat}
                aria-label="Saturation"
                onChange={(e) => onHslChange(hue, e.target.value, light)}
              />
            </div>
            <div className="pal-field">
              <label className="pal-label" htmlFor="pal-light">
                Lightness
              </label>
              <input
                id="pal-light"
                className="pal-input"
                type="number"
                inputMode="numeric"
                value={light}
                aria-label="Lightness"
                onChange={(e) => onHslChange(hue, sat, e.target.value)}
              />
            </div>
          </div>
          <Button kind="primary" onClick={onGenerate}>
            Generate palette
          </Button>
          {record && record.swatches.length > 0 ? (
            <div className="pal-grid">
              {record.swatches.map((swatch, i) => (
                <div key={i} className="swatch pal-swatch">
                  <div className="pal-card-body">
                    <div className="pal-swatch-chip" style={{ background: swatch }} aria-hidden="true" />
                    <MonoLabel sm>{swatch}</MonoLabel>
                    <div className="pal-contrast">Contrast: {contrastAgainstWhite(swatch).toFixed(1)}</div>
                  </div>
                  <div className="pal-swatch-actions">
                    <Button kind="secondary" onClick={() => void onCopy(swatch, i)}>
                      {copiedIndex === i ? 'Copied' : 'Copy hex'}
                    </Button>
                    <Button kind="ghost" onClick={() => onRemove(i)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No palette yet" detail="Pick a hex and a scheme, then generate a palette." />
          )}
        </Stack>
      </div>
    </main>
  )
}
