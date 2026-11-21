import { createMockValue } from '@lacuna/host-mock'

export interface PaletteColor {
  hex: string
  label: string
  ratio?: number
  copies?: number
}

export interface Palette {
  colors: PaletteColor[]
  imageName?: string | null
}

const KEY = 'lacuna.image-color-extractor.palette'

function isValidPalette(v: unknown): v is Palette {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  if (!Array.isArray(o.colors)) return false
  return (o.colors as unknown[]).every((entry) => {
    const c = entry as Record<string, unknown> | null
    if (!c || typeof c !== 'object') return false
    if (typeof c.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.hex)) return false
    return typeof c.label === 'string'
  })
}

const store = createMockValue<Palette>({
  key: KEY,
  fallback: { colors: [] },
  validate: isValidPalette,
})

export function loadPalette(): Palette | null {
  const p = store.get()
  if (!p || !p.colors.length) return null
  return p
}

export function savePalette(palette: Palette): void {
  store.set(palette)
}
