// Colors that are data: swatches for stops and sample gradients.
// This is the only file where a color literal is allowed.

export interface StopColor {
  css: string
  display: string
}

export interface SampleGradient {
  name: string
  kind: 'linear' | 'radial'
  angle: number
  stops: { color: string; position: number }[]
}

const toTwo = (n: number) => n.toString(16).padStart(2, '0')

const swatch = (r: number, g: number, b: number): StopColor => ({
  css: `rgb(${r}, ${g}, ${b})`,
  display: `#${toTwo(r)}${toTwo(g)}${toTwo(b)}`,
})

// Cycled as stops are added.
export const STOP_COLORS: StopColor[] = [swatch(255, 0, 0), swatch(0, 0, 255)]

export function swatchCss(index: number): string {
  return STOP_COLORS[index % STOP_COLORS.length].css
}

export function swatchDisplay(index: number): string {
  return STOP_COLORS[index % STOP_COLORS.length].display
}

export const SAMPLES: SampleGradient[] = [
  {
    name: 'Warm Drift',
    kind: 'linear',
    angle: 90,
    stops: [
      { color: swatch(255, 94, 58).display, position: 0 },
      { color: swatch(255, 183, 3).display, position: 55 },
      { color: swatch(143, 90, 240).display, position: 100 },
    ],
  },
  {
    name: 'Deep Ocean',
    kind: 'radial',
    angle: 0,
    stops: [
      { color: swatch(35, 200, 190).display, position: 0 },
      { color: swatch(0, 80, 170).display, position: 100 },
    ],
  },
]
