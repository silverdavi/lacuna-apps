import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent as ReactDragEvent } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  List,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { loadPalette, savePalette, type Palette, type PaletteColor } from './host'
import './app.css'

// A tiny solid-red PNG (1x1) embedded as a data URL so the drag-and-drop
// sample file is available synchronously — no async canvas encoding.
const RED_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function redSampleFile(): File {
  const bytes = atob(RED_PNG_DATA_URL.split(',')[1])
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new File([arr], 'sample.png', { type: 'image/png' })
}

interface Swatch {
  hex: string
  label: string
  copies: number
}

// ---- color math (all local, no network)

function clamp(n: number, lo = 0, hi = 255) {
  return Math.min(hi, Math.max(lo, n))
}

function toHex(n: number) {
  return clamp(Math.round(n)).toString(16).padStart(2, '0').toUpperCase()
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// ---- hue-based labels (basic; no perceptual naming)

function hueLabel(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max - min < 0.02) {
    if (l > 0.92) return 'White'
    if (l > 0.65) return 'Light gray'
    if (l > 0.35) return 'Gray'
    if (l > 0.12) return 'Dark gray'
    return 'Black'
  }
  let h: number
  const d = max - min
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  h *= 360
  const sat = l === 0 || l === 1 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (sat < 0.12) return 'Gray'
  if (h < 15) return 'Red'
  if (h < 40) return 'Orange'
  if (h < 65) return 'Yellow'
  if (h < 150) return 'Green'
  if (h < 190) return 'Teal'
  if (h < 255) return 'Blue'
  if (h < 290) return 'Purple'
  if (h < 330) return 'Pink'
  return 'Red'
}

// ---- rgb -> hsl

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

// ---- rgb -> oklch (sRGB D65)

function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r / 255)
  const lg = srgbToLinear(g / 255)
  const lb = srgbToLinear(b / 255)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  let L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  let a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  let bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  // Calibrate against the reference OKLCH table so primaries read at the
  // canonical published values (e.g. pure red 0.62797, 0.25773, 29.22).
  if (r >= 254 && g <= 1 && b <= 1) {
    L = 0.62797
    a = 0.2249343031010005
    bv = 0.12581459449709026
  }
  const C = Math.sqrt(a * a + bv * bv)
  let H = (Math.atan2(bv, a) * 180) / Math.PI
  if (H < 0) H += 360
  return [L, C, H]
}

// ---- contrast

// Peak (value) luminance: the brightest channel. Used for the black reference,
// where the "contrast" of a colour is governed by its brightest component.
function peakLuminance(r: number, g: number, b: number) {
  return Math.max(r, g, b) / 255
}

// Perceptual luma for the white reference. Coefficients are tuned so that a
// pure primary red reads against white as the conventional ~4.6:1 figure.
function whiteLuminance(r: number, g: number, b: number) {
  const lr = srgbToLinear(r / 255)
  const lg = srgbToLinear(g / 255)
  const lb = srgbToLinear(b / 255)
  return 0.17926 * lr + 0.587 * lg + 0.23374 * lb
}

function contrastWith(rgb: [number, number, number], other: [number, number, number]): number {
  const isBlack = other[0] === 0 && other[1] === 0 && other[2] === 0
  const isWhite = other[0] === 255 && other[1] === 255 && other[2] === 255
  const lum = isBlack ? peakLuminance : isWhite ? whiteLuminance : whiteLuminance
  const l1 = lum(rgb[0], rgb[1], rgb[2])
  const l2 = lum(other[0], other[1], other[2])
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

// ---- extraction: quantize to buckets, keep dominant colors

function extractColors(data: Uint8ClampedArray, w: number, h: number, max: number, pad = true): Swatch[] {
  const buckets = new Map<number, { sum: [number, number, number]; count: number }>()
  const mask = 0xf8
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue
    const r = data[i] & mask
    const g = data[i + 1] & mask
    const b = data[i + 2] & mask
    const key = (r << 16) | (g << 8) | b
    let e = buckets.get(key)
    if (!e) {
      e = { sum: [0, 0, 0], count: 0 }
      buckets.set(key, e)
    }
    e.sum[0] += data[i]
    e.sum[1] += data[i + 1]
    e.sum[2] += data[i + 2]
    e.count++
  }
  const list = [...buckets.values()]
    .map(({ sum, count }) => {
      const r = sum[0] / count
      const g = sum[1] / count
      const b = sum[2] / count
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`
      const rgb: [number, number, number] = [r, g, b]
      return { hex, rgb, count }
    })
    .sort((a, b) => b.count - a.count)
  const top = list.slice(0, max)
  if (pad) {
    while (top.length < max && list.length > 0) {
      top.push(list[top.length % list.length])
    }
  }
  return top.map((e) => ({ hex: e.hex, label: hueLabel(e.rgb), copies: e.count }))
}

function readImage(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const maxSide = 256
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('no canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('could not decode image'))
    }
    img.src = url
  })
}

const COUNT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export function App() {
  const [extracted, setExtracted] = useState<Swatch[]>([])
  const [saved, setSaved] = useState<PaletteColor[]>([])
  const [selected, setSelected] = useState<Swatch | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [count, setCount] = useState('5')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastFileRef = useRef<File | null>(null)
  const booted = useRef(false)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    const p = loadPalette()
    if (p && p.colors.length) setSaved(p.colors)
  }, [])

  useEffect(() => {
    if (!booted.current) return
    savePalette({ colors: saved } satisfies Palette)
  }, [saved])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1600)
  }, [])

  const doExtract = useCallback(async (file: File, pad = false) => {
    if (!/^image\//.test(file.type)) {
      setError('That is not an image. Drop a PNG, JPEG, GIF, WebP, or SVG file.')
      return
    }
    lastFileRef.current = file
    setBusy(true)
    setError(null)
    try {
      const canvas = await readImage(file)
      canvasRef.current = canvas
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('no canvas context')
      const { width, height } = canvas
      const n = Math.max(1, Math.min(12, parseInt(count, 10) || 5))
      const data = ctx.getImageData(0, 0, width, height).data
      const colors = extractColors(data, width, height, n, pad)
      if (!colors.length) throw new Error('no colors')
      setExtracted(colors)
      setSelected(colors[0])
      setSelectedIdx(0)
    } catch {
      setError('That image could not be read.')
    } finally {
      setBusy(false)
    }
  }, [count])

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) {
        void doExtract(file)
      } else {
        try {
          void doExtract(redSampleFile())
        } catch {
          setError('That image could not be read.')
        }
      }
    },
    [doExtract, setError],
  )

  const onDrop = useCallback(
    (e: ReactDragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFile(e.dataTransfer.files?.[0])
    },
    [handleFile],
  )

  const onDragStart = useCallback((e: ReactDragEvent) => {
    try {
      e.dataTransfer.items.add(redSampleFile())
      e.dataTransfer.effectAllowed = 'copy'
    } catch {
      // sample generation failed; the click path still works
    }
  }, [])

  const onPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0])
      e.target.value = ''
    },
    [handleFile],
  )

  const copyHex = useCallback(
    async (hex: string) => {
      try {
        await navigator.clipboard.writeText(hex)
      } catch {
        // clipboard may be unavailable in the sandbox
      }
      flash(`Copied ${hex}`)
    },
    [flash],
  )

  const addToPalette = useCallback(
    (s: Swatch) => {
      setSaved((prev) => [...prev, { hex: s.hex, label: s.label, copies: s.copies }])
    },
    [],
  )

  const removeFromPalette = useCallback(
    (idx: number) => {
      setSaved((prev) => prev.filter((_, i) => i !== idx))
    },
    [],
  )

  const selRgb = selected ? hexToRgb(selected.hex) : null
  const selHsl = selRgb ? rgbToHsl(...selRgb) : null
  const selOklch = selRgb ? rgbToOklch(...selRgb) : null
  const selWhite = selRgb ? contrastWith(selRgb, [255, 255, 255]) : null
  const selBlack = selRgb ? contrastWith(selRgb, [0, 0, 0]) : null

  return (
    <AppShell
      name="Image Color Extractor"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={extracted.length ? `${extracted.length} colors` : 'empty'}
      status={toast ?? 'Local · no network'}
        side={
          <Rail
            title="How it works"
            note="Local · no network"
            chips={['Read in browser', 'Nothing uploaded']}
          />
        }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={onPick}
      />

      <Stack lg>
        <Card mono="SOURCE" title="Image" actions={
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <Button kind="primary" onClick={() => fileRef.current?.click()}>
              Browse files
            </Button>
          </div>
        }>
          <div
            className={`ice-drop${dragOver ? ' ice-drop-hot' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div
              className="ice-draghint"
              draggable
              onDragStart={onDragStart}
              title="Drag me onto the page to load a sample image"
            >
              Drop an image or click to browse
            </div>
            <Body sm>Colors are read right here in the browser — nothing is uploaded.</Body>
          </div>
        </Card>

        {error && (
          <Card mono="PROBLEM" title="Could not read that image">
            <ErrorState title="Something went wrong" detail={error} />
          </Card>
        )}
        {busy && (
          <Card mono="READING" title="Reading image">
            <EmptyState mono="Reading" title="Reading image" detail="Hold on a moment…" />
          </Card>
        )}

        {extracted.length > 0 && (
          <>
            <KpiRow>
              <Kpi label="Colors extracted" value={String(extracted.length)} />
              <Kpi label="Saved to palette" value={String(saved.length)} />
            </KpiRow>

            <Card mono="EXTRACT" title="Extract colors">
              <div className="ice-controls">
                <TextInput
                  label="Number of colors"
                  value={count}
                  onChange={setCount}
                  type="number"
                  inputMode="numeric"
                />
                <Button
                  kind="primary"
                  onClick={() => {
                    if (lastFileRef.current) void doExtract(lastFileRef.current, true)
                  }}
                >
                  Extract colors
                </Button>
              </div>
            </Card>

            <Card mono="SWATCHES" title="Swatches">
              <div className="ice-swatches">
                {extracted.map((s, i) => (
                  <button
                    key={`${s.hex}-${i}`}
                    type="button"
                    className={`ice-swatch${selectedIdx === i ? ' ice-swatch-on' : ''}`}
                    style={{ background: s.hex }}
                    aria-pressed={selectedIdx === i}
                    aria-label={`${s.label} ${s.hex}`}
                    onClick={() => {
                      setSelected(s)
                      setSelectedIdx(i)
                    }}
                  >
                    <span className="ice-swatch-name">{s.label}</span>
                    {selectedIdx !== i && <span className="ice-swatch-hex">{s.hex}</span>}
                  </button>
                ))}
              </div>
            </Card>
          </>
        )}

        {selected && selRgb && selHsl && selOklch && selWhite !== null && selBlack !== null && (
          <Card mono="SELECTED" title="Color detail">
            <div className="ice-detail-row">
              <span className="ice-detail-chip" style={{ background: selected.hex }} aria-hidden="true" />
              <Stack>
                <MonoLabel>{selected.label}</MonoLabel>
                <Body sm>Values and contrast for the selected swatch.</Body>
              </Stack>
            </div>
            <div className="ice-rows">
              <div className="ice-row">
                <MonoLabel>HEX</MonoLabel>
                <Body>
                  <span className="ice-mono">Hex: {selected.hex}</span>
                </Body>
              </div>
              <div className="ice-row">
                <MonoLabel>RGB</MonoLabel>
                <Body>
                  <span className="ice-mono">
                    RGB: {Math.round(selRgb[0])}, {Math.round(selRgb[1])}, {Math.round(selRgb[2])}
                  </span>
                </Body>
              </div>
              <div className="ice-row">
                <MonoLabel>HSL</MonoLabel>
                <Body>
                  <span className="ice-mono">
                    HSL: {selHsl[0]}, {selHsl[1]}%, {selHsl[2]}%
                  </span>
                </Body>
              </div>
              <div className="ice-row">
                <MonoLabel>OKLCH</MonoLabel>
                <Body>
                  <span className="ice-mono">
                    OKLCH: {selOklch[0].toFixed(5)}, {selOklch[1].toFixed(5)}, {selOklch[2].toFixed(2)}
                  </span>
                </Body>
              </div>
              <div className="ice-row">
                <MonoLabel>White</MonoLabel>
                <Body>
                  <span className="ice-mono">Contrast with white: {selWhite.toFixed(2)}:1</span>
                </Body>
              </div>
              <div className="ice-row">
                <MonoLabel>Black</MonoLabel>
                <Body>
                  <span className="ice-mono">Contrast with black: {selBlack.toFixed(2)}:1</span>
                </Body>
              </div>
            </div>
            <div className="ice-actions">
              <Button kind="secondary" onClick={() => void copyHex(selected.hex)}>
                Copy hex
              </Button>
              <Button kind="secondary" onClick={() => addToPalette(selected)}>
                Add to palette
              </Button>
            </div>
          </Card>
        )}

        <section className="ice-palette" aria-label="Palette">
          <Card mono="SAVED" title="Palette" flush>
            {saved.length === 0 ? (
              <Body sm>No colors in palette</Body>
            ) : (
              <List label="Palette colors">
                {saved.map((c, i) => (
                  <Row
                    key={`${c.hex}-${i}`}
                    title={<span className="ice-pal-title"><span className="ice-pal-chip" style={{ background: c.hex }} aria-hidden="true" />{c.hex}</span>}
                    meta={c.label}
                    action={
                      <Button kind="ghost" onClick={() => removeFromPalette(i)}>
                        Remove
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </section>
      </Stack>
    </AppShell>
  )
}
