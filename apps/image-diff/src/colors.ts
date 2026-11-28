// Colour tokens used by canvas drawing. Canvas cannot read var(), so each one is resolved at
// run time from the live theme. No colour literal lives here, only token names.
import type { RGB } from './diff.ts'

/** Heatmap ramp, low difference to high. */
export const HEAT_TOKENS = ['--paper-deep', '--geo-cobalt', '--geo-teal', '--geo-gold', '--geo-verm']
export const ACCENT_TOKEN = '--accent'
export const SAMPLE_TOKENS = {
  ground: '--paper-deep',
  ink: '--ink',
  a: '--geo-cobalt',
  b: '--geo-teal',
  c: '--geo-gold',
  d: '--geo-verm',
  shift: '--geo-gold',
}

/** The computed colour of a token as a CSS string, via a probe element. */
export function tokenCss(name: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

let scratch: CanvasRenderingContext2D | null = null

/** Any CSS colour to 0-255 RGB, by painting one pixel. */
export function cssToRgb(css: string): RGB {
  if (!scratch) {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    scratch = c.getContext('2d', { willReadFrequently: true })
  }
  const ctx = scratch!
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2]]
}

export const tokenRgb = (name: string): RGB => cssToRgb(tokenCss(name))
export const resolveRamp = (): RGB[] => HEAT_TOKENS.map(tokenRgb)
