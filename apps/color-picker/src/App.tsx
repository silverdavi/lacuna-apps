import { useEffect, useMemo, useRef, useState } from 'react'
import { Body, Button, Card, Stack, Title } from '@lacuna/ui'
import { host } from './host'
import './app.css'

interface Rgb {
  r: number
  g: number
  b: number
}

function clampByte(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}

function toHex(rgb: Rgb): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, '0').toUpperCase()
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`
}

function parseHex(input: string): Rgb | null {
  const m = input.replace(/\s+/g, '').replace(/^#/, '').match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function srgbToLinear(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return clampByte(c * 255)
}

function rgbToXyz(rgb: Rgb): [number, number, number] {
  const r = srgbToLinear(rgb.r)
  const g = srgbToLinear(rgb.g)
  const b = srgbToLinear(rgb.b)
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  ]
}

function xyzToOklab(xyz: [number, number, number]): [number, number, number] {
  const [x, y, z] = xyz
  const l = Math.cbrt(0.4122214708 * x + 0.5363325363 * y + 0.0514459929 * z)
  const m = Math.cbrt(0.2119034982 * x + 0.6806995451 * y + 0.1073969566 * z)
  const s = Math.cbrt(0.0883024619 * x + 0.2817188376 * y + 0.6299787005 * z)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToLch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b)
  let H = (Math.atan2(b, a) * 180) / Math.PI
  if (H < 0) H += 360
  return [L, C, H]
}

function rgbToOklch(rgb: Rgb): [number, number, number] {
  return oklabToLch(...xyzToOklab(rgbToXyz(rgb)))
}

function oklchToOklab(L: number, C: number, Hdeg: number): [number, number, number] {
  const h = (Hdeg * Math.PI) / 180
  return [L, C * Math.cos(h), C * Math.sin(h)]
}

function oklabToXyz(L: number, a: number, b: number): [number, number, number] {
  const l = L + 0.3963377774 * a + 0.2158037573 * b
  const m = L - 0.1055613458 * a - 0.0638541728 * b
  const s = L - 0.0894841775 * a - 1.291485548 * b
  const l3 = l * l * l
  const m3 = m * m * m
  const s3 = s * s * s
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}

function xyzToRgb(xyz: [number, number, number]): Rgb {
  const [x, y, z] = xyz
  const r = 4.0767417588 * x - 2.2953173142 * y - 0.5645482629 * z
  const g = -1.1135769339 * x + 2.2633786656 * y - 0.4547018521 * z
  const b = -0.017084207 * x - 0.6819658296 * y + 1.0019996878 * z
  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) }
}

function oklchToRgb(L: number, C: number, Hdeg: number): Rgb {
  const [Lc, a, b] = oklchToOklab(L, C, Hdeg)
  return xyzToRgb(oklabToXyz(Lc, a, b))
}

function rgbToHsl(rgb: Rgb): [number, number, number] {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s * 100, l * 100]
}

function hslToRgb(Hdeg: number, S: number, L: number): Rgb {
  const s = S / 100
  const l = L / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (((Hdeg % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = l - c / 2
  return { r: clampByte((r + m) * 255), g: clampByte((g + m) * 255), b: clampByte((b + m) * 255) }
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

function contrastLuminance(rgb: Rgb): number {
  return (
    0.2126 * Math.pow(rgb.r / 255, 1.895) +
    0.7152 * Math.pow(rgb.g / 255, 1.895) +
    0.0722 * Math.pow(rgb.b / 255, 1.895)
  )
}

function contrastRatio(rgb: Rgb, other: Rgb): string {
  const a = contrastLuminance(rgb)
  const b = contrastLuminance(other)
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  const c = 1 / 30.559
  return ((hi + c) / (lo + c)).toFixed(2)
}

function contrastOnWhite(rgb: Rgb): string {
  return contrastRatio(rgb, WHITE)
}

function contrastOnBlack(rgb: Rgb): string {
  return contrastRatio(rgb, BLACK)
}

function numOr(v: string, fallback: number): number {
  const n = parseFloat(v)
  return Number.isNaN(n) ? fallback : n
}

function swatchToRgb(hexValue: string): string {
  const parsed = parseHex(hexValue)
  if (!parsed) return 'rgb(128, 128, 128)'
  return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`
}

let fieldSeq = 0
function Field({
  label,
  ariaLabel,
  noAria,
  value,
  onChange,
  readonly,
  inputMode,
}: {
  label: string
  ariaLabel?: string
  noAria?: boolean
  value: string
  onChange?: (v: string) => void
  readonly?: boolean
  inputMode?: 'numeric' | 'decimal'
}) {
  const id = useRef('')
  if (id.current === '') id.current = 'cp-' + (fieldSeq = fieldSeq + 1)
  const ariaAttr = noAria ? null : { 'aria-label': ariaLabel ?? label }
  return (
    <div className="cp-field">
      <span className="cp-field-label" id={id.current + '-label'}>
        {label}
      </span>
      <input
        id={id.current}
        className="cp-input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readonly}
        inputMode={inputMode}
        {...ariaAttr}
        spellCheck={false}
      />
    </div>
  )
}

function copyText(text: string): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
  } else {
    fallbackCopy(text)
  }
}

function fallbackCopy(text: string): void {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } catch {
    /* ignore */
  }
  document.body.removeChild(ta)
}

export function App() {
  const [hex, setHex] = useState<string>(() => {
    const h = host.load()?.hex
    return h && parseHex(h) ? h.toUpperCase() : '#FF5733'
  })
  const [palette, setPalette] = useState<string[]>(() => host.load()?.palette ?? [])

  const rgb = useMemo(() => parseHex(hex) ?? { r: 255, g: 87, b: 51 }, [hex])

  const [rgbStr, setRgbStr] = useState(() => ({
    r: String(rgb.r),
    g: String(rgb.g),
    b: String(rgb.b),
  }))
  const [hslStr, setHslStr] = useState(() => {
    const [h, s, l] = rgbToHsl(rgb)
    return { h: String(Math.round(h)), s: String(Math.round(s)), l: String(Math.round(l)) }
  })
  const [oklchStr, setOklchStr] = useState(() => {
    const [L, C, H] = rgbToOklch(rgb)
    return { l: String(Math.round(L * 100)), c: C.toFixed(2), h: String(Math.round(H)) }
  })
  const [contrastStr, setContrastStr] = useState(() => ({
    white: contrastOnWhite(rgb),
    black: contrastOnBlack(rgb),
  }))
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => {
    const parsed = parseHex(hex)
    if (parsed) {
      setRgbStr({ r: String(parsed.r), g: String(parsed.g), b: String(parsed.b) })
      const [h, s, l] = rgbToHsl(parsed)
      setHslStr({ h: String(Math.round(h)), s: String(Math.round(s)), l: String(Math.round(l)) })
      const [L, C, H] = rgbToOklch(parsed)
      setOklchStr({ l: String(Math.round(L * 100)), c: String(Math.round(C * 100)), h: String(Math.round(H)) })
      setContrastStr({ white: contrastOnWhite(parsed), black: contrastOnBlack(parsed) })
    }
    host.save({ id: 'color', hex, palette, savedAt: new Date().toISOString() })
  }, [hex, palette])

  const onRgb = (key: 'r' | 'g' | 'b', value: string) => {
    setRgbStr((prev) => ({ ...prev, [key]: value }))
    const base = parseHex(hex) ?? rgb
    const r = key === 'r' ? clampByte(numOr(value, base.r)) : base.r
    const g = key === 'g' ? clampByte(numOr(value, base.g)) : base.g
    const b = key === 'b' ? clampByte(numOr(value, base.b)) : base.b
    setHex(toHex({ r, g, b }))
  }

  const onHsl = (key: 'h' | 's' | 'l', value: string) => {
    setHslStr((prev) => ({ ...prev, [key]: value }))
    const [h0, s0, l0] = rgbToHsl(rgb)
    const h = key === 'h' ? numOr(value, h0) : h0
    const s = key === 's' ? numOr(value, s0) : s0
    const l = key === 'l' ? numOr(value, l0) : l0
    setHex(toHex(hslToRgb(h, s, l)))
  }

  const onOklch = (key: 'l' | 'c' | 'h', value: string) => {
    setOklchStr((prev) => ({ ...prev, [key]: value }))
    const [L0, C0, H0] = rgbToOklch(rgb)
    const L = key === 'l' ? numOr(value, L0 * 100) / 100 : L0
    const C = key === 'c' ? numOr(value, C0 * 100) / 100 : C0
    const H = key === 'h' ? numOr(value, H0) : H0
    setHex(toHex(oklchToRgb(L, C, H)))
  }

  const onHex = (value: string) => {
    setHex(value.startsWith('#') ? value : value)
    const parsed = parseHex(value)
    if (parsed) setRgbStr({ r: String(parsed.r), g: String(parsed.g), b: String(parsed.b) })
  }

  const generatePalette = () => {
    const [h, s, l] = rgbToHsl(rgb)
    const steps = [0, 12, -12, 24, -24]
    const colors = steps.map((d) => toHex(hslToRgb(h + d, s, l)))
    setPalette((prev) => [...prev, ...colors])
  }

  const removeSwatch = (index: number) => {
    setPalette((prev) => prev.filter((_, i) => i !== index))
  }

  const copyHex = () => {
    const value = hex.startsWith('#') ? hex : `#${hex}`
    copyText(value)
    setCopied(true)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
    }
  }, [])

  const preview = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`

  return (
    <main className="cp-app">
      <Card mono="Color" title="Color Picker">
        <Stack>
          <Title>Color Picker</Title>
          <Body>
            Pick a color and convert it between hex, RGB, HSL, and OKLCH. Generate palettes, check contrast,
            and copy values to the clipboard.
          </Body>
          <div className="cp-preview" style={{ background: preview }} aria-hidden="true" />
          <div className="cp-actions">
            {copied ? (
              <Button kind="primary">Copied!</Button>
            ) : (
              <Button kind="primary" onClick={copyHex}>Copy Hex</Button>
            )}
          </div>

          <span className="cp-section" aria-hidden="true">
            Hex
          </span>
          <div className="cp-row">
            <Field label="Hex" value={hex} onChange={onHex} />
          </div>

          <span className="cp-section" aria-hidden="true">
            RGB
          </span>
          <div className="cp-row">
            <Field label="R" value={rgbStr.r} onChange={(v) => onRgb('r', v)} inputMode="numeric" />
            <Field label="G" value={rgbStr.g} onChange={(v) => onRgb('g', v)} inputMode="numeric" />
            <Field label="B" value={rgbStr.b} onChange={(v) => onRgb('b', v)} inputMode="numeric" />
          </div>

          <span className="cp-section" aria-hidden="true">
            HSL
          </span>
          <div className="cp-row">
            <Field label="H" value={hslStr.h} onChange={(v) => onHsl('h', v)} inputMode="numeric" />
            <Field label="S" value={hslStr.s} onChange={(v) => onHsl('s', v)} inputMode="numeric" />
            <Field label="L" value={hslStr.l} onChange={(v) => onHsl('l', v)} inputMode="numeric" />
          </div>

          <span className="cp-section" aria-hidden="true">
            OKLCH
          </span>
          <div className="cp-row">
            <Field label="OKLCH L" noAria value={oklchStr.l} onChange={(v) => onOklch('l', v)} inputMode="numeric" />
            <Field label="OKLCH C" noAria value={oklchStr.c} onChange={(v) => onOklch('c', v)} inputMode="numeric" />
            <Field label="OKLCH H" noAria value={oklchStr.h} onChange={(v) => onOklch('h', v)} inputMode="numeric" />
          </div>

          <span className="cp-section" aria-hidden="true">
            Contrast
          </span>
          <div className="cp-row">
            <Field label="Contrast on White" noAria value={contrastStr.white} readonly />
            <Field label="Contrast on Black" noAria value={contrastStr.black} readonly />
          </div>

          <span className="cp-section" aria-hidden="true">
            Palette
          </span>
          <div className="cp-actions">
            <Button kind="primary" onClick={generatePalette}>
              Generate Palette
            </Button>
          </div>
          {palette.length === 0 ? (
            <Body sm>No swatches yet. Generate a palette from the current color.</Body>
          ) : (
            <div className="cp-grid">
              {palette.map((swatch, i) => (
                <div key={`${swatch}-${i}`} className="cp-swatch">
                  <span className="cp-swatch-chip" style={{ background: swatchToRgb(swatch) }} aria-hidden="true" />
                  <span className="cp-swatch-hex">{swatch}</span>
                  <button type="button" className="cp-remove" onClick={() => removeSwatch(i)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <span className="cp-section" aria-hidden="true">
            Gradient
          </span>
          <div
            className="cp-gradient"
            style={{ background: `linear-gradient(to right, ${preview}, rgb(255, 255, 255))` }}
            aria-hidden="true"
          />
        </Stack>
      </Card>
    </main>
  )
}
