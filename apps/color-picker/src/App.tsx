// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState, type ReactNode } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, List, PrimaryButton, Row, TextInput } from '@lacuna/ui'
import { contrastRatio, hexToRgb, type RGB } from '@lacuna/color-math'
import { useClipboard } from '@lacuna/use-clipboard'
import { swatchBackground } from './colors'
import { useColorStore } from './store'
import './app.css'

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function clampByte(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}

function clampHue(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(360, Math.max(0, Math.round(n)))
}

function rgbToHex(rgb: RGB): string {
  const to = (n: number) => clampByte(n).toString(16).padStart(2, '0')
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`
}

function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: 0 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: Math.round((((h / 6) * 360) + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(Hdeg: number, S: number, L: number): RGB {
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

function buildPalette(rgb: RGB, baseHex: string, h: number, s: number, l: number): string[] {
  const derived = [72, 144, 216, 288].map((d) => {
    const c = hslToRgb((((h + d) % 360) + 360) % 360, s, l)
    return rgbToHex(c).toUpperCase()
  })
  return [baseHex, ...derived]
}

export function App() {
  const { value: state, set: setState } = useColorStore({ defaultRgb: { r: 255, g: 87, b: 51 } })
  const { copy, copied } = useClipboard()
  const [hexError, setHexError] = useState<string | null>(null)

  const rgb: RGB = { r: state.r, g: state.g, b: state.b }
  const hex = rgbToHex(rgb).toUpperCase()
  const { h, s, l } = rgbToHsl(rgb)

  const contrastWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 })
  const contrastBlack = contrastRatio(rgb, { r: 0, g: 0, b: 0 })

  function patch(next: { r?: number; g?: number; b?: number; palette?: string[] }) {
    setState((prev) => ({ ...prev, ...next }))
  }

  function onHexChange(value: string) {
    const v = value.trim()
    if (v === hex) {
      setHexError(null)
      return
    }
    const normalized = v.startsWith('#') ? v : `#${v}`
    if (!HEX_RE.test(normalized)) {
      setHexError('Invalid hex')
      patch({ r: 0, g: 0, b: 0 })
      return
    }
    setHexError(null)
    try {
      const c = hexToRgb(normalized)
      patch({ r: c.r, g: c.g, b: c.b })
    } catch {
      setHexError('Invalid hex')
    }
  }

  function onChannel(label: 'r' | 'g' | 'b', value: string) {
    const n = value === '' ? 0 : parseInt(value, 10)
    patch({ [label]: clampByte(n) })
  }

  function onHsl(label: 'h' | 's' | 'l', value: string) {
    const n = value === '' ? 0 : parseInt(value, 10)
    const H = label === 'h' ? clampHue(n) : h
    const S = label === 's' ? clampByte(n) : s
    const L = label === 'l' ? clampByte(n) : l
    const c = hslToRgb(H, S, L)
    setHexError(null)
    patch({ r: c.r, g: c.g, b: c.b })
  }

  function generate() {
    patch({ palette: buildPalette(rgb, hex, h, s, l) })
  }

  function removeSwatch(value: string) {
    patch({ palette: state.palette.filter((p) => p !== value) })
  }

  return (
    <AppShell
      name="Color Picker"
      icon="paint"
      hue="blue"
      category="Productivity"
      meta={`${state.palette.length} swatches`}
    >
      <Card mono="Color" title="Pick a color">
        <FormGrid>
          <TextInput label="Hex" value={hex} onChange={onHexChange} error={hexError} />
          <div className="cp-row">
            <TextInput label="R" type="number" value={String(state.r)} onChange={(v) => onChannel('r', v)} />
            <TextInput label="G" type="number" value={String(state.g)} onChange={(v) => onChannel('g', v)} />
            <TextInput label="B" type="number" value={String(state.b)} onChange={(v) => onChannel('b', v)} />
          </div>
          <div className="cp-row">
            <TextInput label="H" type="number" value={String(h)} onChange={(v) => onHsl('h', v)} />
            <TextInput label="S" type="number" value={String(s)} onChange={(v) => onHsl('s', v)} />
            <TextInput label="L" type="number" value={String(l)} onChange={(v) => onHsl('l', v)} />
          </div>
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={generate}>Generate Palette</PrimaryButton>
          <Button kind="secondary" onClick={() => void copy(hex)}>{copied ? 'Copied!' : 'Copy Hex'}</Button>
        </Actions>
      </Card>

      <Card mono="Check" title="Contrast" accent>
        <div className="cp-swatch" style={{ background: swatchBackground(state.r, state.g, state.b) }} aria-hidden="true" />
        <div className="cp-contrast-note">
          <span>Contrast on White: {contrastWhite.toFixed(2)}</span>
          <span>Contrast on Black: {contrastBlack.toFixed(2)}</span>
        </div>
      </Card>

      <Card mono={`${state.palette.length} saved`} title="Palette">
        {state.palette.length === 0 ? (
          <EmptyState mono="Empty" title="No palette yet" detail="Use Generate Palette to build one from the current color." actionLabel="Press Generate Palette" onAction={generate} />
        ) : (
          <List label="Palette">
            {state.palette.map((value) => (
              <Row
                key={value}
                title={value}
                value={value}
                action={
                  <Button kind="ghost" onClick={() => removeSwatch(value)}>
                    Remove {value}
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
