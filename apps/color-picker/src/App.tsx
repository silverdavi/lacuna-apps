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
  if (!Number.isFinite(n)) return 0
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

function rgbToHsl(rgb: Rgb): [number, number, number] {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, 0]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [Math.round((((h / 6) * 360 + 360) % 360)), Math.round(s * 100), Math.round(l * 100)]
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
  return {
    r: clampByte((r + m) * 255),
    g: clampByte((g + m) * 255),
    b: clampByte((b + m) * 255),
  }
}

function srgbToLinear(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relLuminance(rgb: Rgb): number {
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b)
}

function contrastRatio(rgb: Rgb, other: Rgb): string {
  const a = relLuminance(rgb)
  const b = relLuminance(other)
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return ((hi + 0.05) / (lo + 0.05)).toFixed(2)
}

function parseNum(input: string, fallback: number): number {
  const n = Number(input)
  if (!Number.isFinite(n)) return fallback
  return n
}

function swatchToRgb(hexValue: string): string {
  const parsed = parseHex(hexValue)
  if (!parsed) return 'rgb(128, 128, 128)'
  return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`
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

function loadInitial(): { hex: string; palette: string[] } {
  const rec = host.load()
  if (rec && typeof rec.hex === 'string' && parseHex(rec.hex)) {
    return { hex: rec.hex.toUpperCase(), palette: Array.isArray(rec.palette) ? rec.palette.filter((p) => typeof p === 'string') : [] }
  }
  return { hex: toHex({ r: 0, g: 0, b: 0 }), palette: [] }
}

let labelSeq = 0
let inputSeq = 0

function makeInputId(): string {
  inputSeq += 1
  return `cp-input-${inputSeq}`
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'numeric' | 'decimal'
}) {
  const inputId = useMemo(makeInputId, [])
  return (
    <div className="cp-field">
      <label className="cp-field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="cp-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        spellCheck={false}
      />
    </div>
  )
}

function HexField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const inputId = useMemo(makeInputId, [])
  return (
    <div className="cp-field">
      <label className="cp-field-label" htmlFor={inputId}>
        #
      </label>
      <input
        id={inputId}
        className="cp-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  )
}

export function App() {
  const initial = useMemo(loadInitial, [])
  const [hex, setHex] = useState(initial.hex)
  const [palette, setPalette] = useState<string[]>(initial.palette)
  const [rgbStr, setRgbStr] = useState({ r: '0', g: '0', b: '0' })
  const [hslStr, setHslStr] = useState({ h: '0', s: '0', l: '0' })
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  const parsed = parseHex(hex)

  useEffect(() => {
    if (!parsed) return
    setRgbStr({ r: String(parsed.r), g: String(parsed.g), b: String(parsed.b) })
    const [h, s, l] = rgbToHsl(parsed)
    setHslStr({ h: String(h), s: String(s), l: String(l) })
  }, [parsed])

  useEffect(() => {
    host.save({ id: 'color', hex: parsed ? toHex(parsed) : hex, palette, savedAt: new Date().toISOString() })
  }, [hex, palette, parsed])

  const onRgb = (key: 'r' | 'g' | 'b', value: string) => {
    setRgbStr((prev) => ({ ...prev, [key]: value }))
    const base = parsed ?? { r: 0, g: 0, b: 0 }
    const r = key === 'r' ? clampByte(parseNum(value, base.r)) : base.r
    const g = key === 'g' ? clampByte(parseNum(value, base.g)) : base.g
    const b = key === 'b' ? clampByte(parseNum(value, base.b)) : base.b
    setHex(toHex({ r, g, b }))
  }

  const onHsl = (key: 'h' | 's' | 'l', value: string) => {
    setHslStr((prev) => ({ ...prev, [key]: value }))
    const base = parsed ? rgbToHsl(parsed) : [0, 0, 0]
    const h = key === 'h' ? parseNum(value, base[0]) : base[0]
    const s = key === 's' ? Math.min(100, Math.max(0, parseNum(value, base[1]))) : base[1]
    const l = key === 'l' ? Math.min(100, Math.max(0, parseNum(value, base[2]))) : base[2]
    setHex(toHex(hslToRgb(h, s, l)))
  }

  const onHexInput = (value: string) => {
    setHex(value)
  }

  const generatePalette = () => {
    const base = parsed ?? { r: 0, g: 0, b: 0 }
    const [h, s, l] = rgbToHsl(base)
    const current = toHex(base)
    const derived = [72, 144, 216, 288].map((d) => toHex(hslToRgb(((h + d) % 360 + 360) % 360, s, l)))
    setPalette([current, ...derived])
  }

  const removeSwatch = (value: string) => {
    setPalette((prev) => prev.filter((p) => p !== value))
  }

  const copyHex = () => {
    const value = parsed ? toHex(parsed) : hex
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

  const preview = parsed
    ? `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`
    : 'rgb(128, 128, 128)'
  const onWhite = parsed ? contrastRatio(parsed, { r: 255, g: 255, b: 255 }) : '—'
  const onBlack = parsed ? contrastRatio(parsed, { r: 0, g: 0, b: 0 }) : '—'
  const invalid = !parsed

  return (
    <main className="cp-app">
      <Card mono="Color" title="Color Picker">
        <Stack>
          <Body>
            Pick a color and convert it between hex, RGB, and HSL. Generate palettes, check WCAG contrast
            ratios, and copy values to the clipboard.
          </Body>
          <div className="cp-preview" style={{ background: preview }} aria-hidden="true" />
          <div className="cp-row">
            <HexField value={hex} onChange={onHexInput} />
          </div>
          {invalid && (
            <p className="cp-error" role="alert">
              Invalid hex
            </p>
          )}
          <div className="cp-row">
            <Field label="R" value={rgbStr.r} onChange={(v) => onRgb('r', v)} inputMode="numeric" />
            <Field label="G" value={rgbStr.g} onChange={(v) => onRgb('g', v)} inputMode="numeric" />
            <Field label="B" value={rgbStr.b} onChange={(v) => onRgb('b', v)} inputMode="numeric" />
          </div>
          <div className="cp-row">
            <Field label="H" value={hslStr.h} onChange={(v) => onHsl('h', v)} inputMode="numeric" />
            <Field label="S" value={hslStr.s} onChange={(v) => onHsl('s', v)} inputMode="numeric" />
            <Field label="L" value={hslStr.l} onChange={(v) => onHsl('l', v)} inputMode="numeric" />
          </div>
          <div className="cp-row">
            <Button kind="primary" onClick={copyHex}>
              {copied ? 'Copied!' : 'Copy Hex'}
            </Button>
            <Button onClick={generatePalette}>Generate Palette</Button>
          </div>
          <div className="cp-contrast">
            <span>Contrast on White: {onWhite}</span>
            <span>Contrast on Black: {onBlack}</span>
          </div>
          {palette.length === 0 ? (
            <Body sm>No swatches yet. Generate a palette from the current color.</Body>
          ) : (
            <ul className="cp-palette" aria-label="Palette">
              {palette.map((swatch) => (
                <li key={swatch} className="cp-swatch">
                  <span className="cp-swatch-chip" style={{ background: swatchToRgb(swatch) }} aria-hidden="true" />
                  <span className="cp-swatch-hex">{swatch}</span>
                  <button type="button" className="cp-remove" onClick={() => removeSwatch(swatch)}>
                    Remove {swatch}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Card>
    </main>
  )
}
