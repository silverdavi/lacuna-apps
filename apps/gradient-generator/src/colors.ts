export interface StopColor {
  /** The CSS `rgb(...)` value, used for the swatch and the gradient. */
  css: string
  /** The display form shown next to the stop, e.g. the hex string for red. */
  display: string
}

const toTwo = (n: number) => n.toString(16).padStart(2, '0')

const swatch = (r: number, g: number, b: number): StopColor => ({
  css: `rgb(${r}, ${g}, ${b})`,
  display: `#${toTwo(r)}${toTwo(g)}${toTwo(b)}`,
})

// Primary swatch palette, cycled as stops are added.
export const STOP_COLORS: StopColor[] = [swatch(255, 0, 0), swatch(0, 0, 255)]

export function swatchCss(index: number): string {
  return STOP_COLORS[index % STOP_COLORS.length].css
}

export function swatchDisplay(index: number): string {
  return STOP_COLORS[index % STOP_COLORS.length].display
}
