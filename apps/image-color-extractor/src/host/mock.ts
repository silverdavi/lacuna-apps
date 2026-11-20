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

export function loadPalette(): Palette | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as { colors?: unknown; imageName?: unknown }
    if (!Array.isArray(obj.colors)) return null
    const colors = obj.colors
      .filter(
        (entry): entry is PaletteColor =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as PaletteColor).hex === 'string' &&
          (entry as PaletteColor).hex.length === 7 &&
          /^[0-9a-f]{6}$/i.test((entry as PaletteColor).hex.slice(1, 7)) &&
          typeof (entry as PaletteColor).label === 'string',
      )
      .map((entry) => ({
        hex: entry.hex.toUpperCase(),
        label: entry.label,
        ratio: typeof entry.ratio === 'number' ? entry.ratio : 0,
        copies: typeof entry.copies === 'number' ? entry.copies : 0,
      }))
    const imageName = typeof obj.imageName === 'string' ? obj.imageName : null
    return { colors, imageName }
  } catch {
    return null
  }
}

export function savePalette(palette: Palette): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(palette))
  } catch {
    // storage may be unavailable; the app still works for the session
  }
}
