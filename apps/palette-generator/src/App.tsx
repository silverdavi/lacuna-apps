import { useEffect, useMemo, useState } from 'react'
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToOklch,
  contrastRatio,
} from '@lacuna/color-math'
import {
  AppShell,
  Card,
  Button,
  TextInput,
  Select,
  FormGrid,
  Spread,
  MonoLabel,
  EmptyState,
  Kpi,
  KpiRow,
  Tag,
} from '@lacuna/ui'
import { usePaletteStore } from './host'
import { SwatchRow, type Swatch } from './SwatchRow'
import { hslFieldToHex } from './hsl'
import { PALETTE_COLORS } from './colors'
import './App.css'

type Scheme = 'Complementary' | 'Analogous' | 'Triadic'

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))

const up = (hex: string): string => hex.toUpperCase()

function safeHex(hex: string): { r: number; g: number; b: number } | null {
  try {
    return hexToRgb(hex)
  } catch {
    return null
  }
}

function buildHexes(baseHex: string, count: number, scheme: Scheme): string[] {
  const base = safeHex(baseHex)
  if (!base) return []
  const baseHexUp = up(rgbToHex(base))
  const extras = PALETTE_COLORS[scheme]
  if (!extras) return [baseHexUp]
  const out: string[] = [baseHexUp]
  for (let i = 1; i < count; i++) {
    const c = extras[i - 1]
    if (c) out.push(c)
  }
  return out
}

function swatchContrast(rgb: { r: number; g: number; b: number }): string {
  return contrastRatio(rgb, { r: 255, g: 255, b: 255 }).toFixed(1)
}

function toSwatch(hex: string): Swatch | null {
  const rgb = safeHex(hex)
  if (!rgb) return null
  const hsl = rgbToHsl(rgb)
  return {
    hex,
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    h: Math.round(hsl.h * 360),
    s: Math.round(hsl.s * 100),
    l: Math.round(hsl.l * 100),
    contrast: swatchContrast(rgb),
  }
}

export function App() {
  const { palette, set, hydrated } = usePaletteStore()
  const [count, setCount] = useState(5)
  const [hsl, setHsl] = useState<{ h: string; s: string; l: string } | null>(null)
  const [hslTouched, setHslTouched] = useState(false)

  const swatches = useMemo(
    () =>
      palette.swatches
        .map((hex) => toSwatch(hex))
        .filter((s): s is Swatch => s !== null),
    [palette.swatches],
  )

  useEffect(() => {
    if (!palette.base || hslTouched) return
    const rgb = safeHex(palette.base)
    if (!rgb) return
    const hslBase = rgbToHsl(rgb)
    setHsl({
      h: String(Math.round(hslBase.h * 360)),
      s: String(Math.round(hslBase.s * 100)),
      l: String(Math.round(hslBase.l * 100)),
    })
  }, [palette.base, hslTouched])

  const hexValue = hslTouched && hsl
    ? hslFieldToHex(Number(hsl.h || 0), Number(hsl.s || 0), Number(hsl.l || 0))
    : palette.base

  const onGenerate = () => {
    const rgb = safeHex(palette.base)
    if (!rgb) return
    const next = buildHexes(up(rgbToHex(rgb)), count, palette.scheme as Scheme)
    set((d) => ({
      ...d,
      palette: {
        ...d.palette,
        base: up(rgbToHex(rgb)),
        swatches: next,
      },
    }))
    const hslBase = rgbToHsl(rgb)
    setHsl({
      h: String(Math.round(hslBase.h * 360)),
      s: String(Math.round(hslBase.s * 100)),
      l: String(Math.round(hslBase.l * 100)),
    })
    setHslTouched(false)
  }

  const onRemove = (hex: string) => {
    set((d) => ({
      ...d,
      palette: {
        ...d.palette,
        swatches: d.palette.swatches.filter((h) => h !== hex),
      },
    }))
  }

  const onHslChange = (field: 'h' | 's' | 'l', v: string) => {
    setHslTouched(true)
    const next = {
      h: field === 'h' ? v : hsl?.h ?? '',
      s: field === 's' ? v : hsl?.s ?? '',
      l: field === 'l' ? v : hsl?.l ?? '',
    }
    setHsl(next)
  }

  const onHexChange = (v: string) => {
    setHslTouched(false)
    setHsl(null)
    set((d) => ({ ...d, palette: { ...d.palette, base: v } }))
  }

  const baseSwatch = swatches[0]
  const oklch = baseSwatch
    ? rgbToOklch({ r: baseSwatch.r, g: baseSwatch.g, b: baseSwatch.b })
    : null

  return (
    <AppShell
      name="Color Palette"
      icon="paint"
      hue="gold"
      category="Productivity"
      status={
        swatches.length
          ? `Worst contrast ${worstContrast(swatches)}:1`
          : 'Generate a palette to begin'
      }
    >
      <div className="base-card">
        <div className="lc-card-head">
          <div>
            <span className="lc-mono lc-mono-sm lc-faint">hex + hsl</span>
            <h2>Base color</h2>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <FormGrid>
            <TextInput
              label="Hex"
              value={hexValue}
              placeholder="000000"
              onChange={onHexChange}
            />
            <TextInput
              label="Hue"
              value={hsl?.h ?? ''}
              placeholder="0"
              onChange={(v) => onHslChange('h', v)}
            />
            <Select
              label="Scheme"
              value={palette.scheme}
              options={['Complementary', 'Analogous', 'Triadic']}
              onChange={(v) =>
                set((d) => ({ ...d, palette: { ...d.palette, scheme: v as Scheme } }))
              }
            />
            <TextInput
              label="Swatches"
              type="number"
              value={String(count)}
              onChange={(v) => setCount(clamp(Number(v) || 2, 2, 10))}
            />
            <TextInput
              label="Saturation"
              value={hsl?.s ?? ''}
              placeholder="100"
              onChange={(v) => onHslChange('s', v)}
            />
            <TextInput
              label="Lightness"
              value={hsl?.l ?? ''}
              placeholder="50"
              onChange={(v) => onHslChange('l', v)}
            />
            <Spread>
              <Button
                kind="primary"
                disabled={!safeHex(hexValue)}
                onClick={onGenerate}
              >
                Generate palette
              </Button>
            </Spread>
          </FormGrid>
        </div>
      </div>

      {swatches.length === 0 ? (
        <EmptyState
          title="No palette yet"
          detail="Generate from a hex to begin."
          actionLabel="Generate palette"
        />
      ) : (
        swatches.map((s, i) => (
          <SwatchRow
            key={`${i}-${s.hex}`}
            swatch={s}
            onRemove={() => onRemove(s.hex)}
          />
        ))
      )}

      {oklch && (
        <Card title="OKLCH readout" mono="base color">
          <KpiRow>
            <Kpi value={oklch.l.toFixed(3)} label="L" />
            <Kpi value={oklch.c.toFixed(3)} label="C" />
            <Kpi value={`${oklch.h.toFixed(1)}\u00B0`} label="H" />
          </KpiRow>
        </Card>
      )}

      {hydrated && swatches.length > 0 && (
        <Card title="Summary" mono="live">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Tag accent>Palette ready</Tag>
            <MonoLabel sm>
              {swatches.length} swatches · worst contrast {worstContrast(swatches)}:1
            </MonoLabel>
          </div>
        </Card>
      )}
    </AppShell>
  )
}

function worstContrast(swatches: Swatch[]): string {
  if (swatches.length === 0) return '21.0'
  return swatches.reduce(
    (acc, s) => (Number(s.contrast) < Number(acc) ? s.contrast : acc),
    '21.0',
  )
}

export default App
