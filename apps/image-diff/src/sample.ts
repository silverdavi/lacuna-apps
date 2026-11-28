// Two synthetic images drawn in code so the app can be tried with no files.
import { SAMPLE_TOKENS as T, tokenCss } from './colors'
import type { Source } from './pipeline'

const W = 640
const H = 400

function draw(shifted: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const c = (k: keyof typeof T) => tokenCss(T[k])
  ctx.fillStyle = c('ground')
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = shifted ? c('shift') : c('a')
  ctx.beginPath()
  ctx.arc(150, 140, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c('b')
  ctx.fillRect(300, 60, 140, 90)
  ctx.fillStyle = c('c')
  ctx.beginPath()
  ctx.moveTo(500, 220)
  ctx.lineTo(590, 340)
  ctx.lineTo(410, 340)
  ctx.closePath()
  ctx.fill()
  // The square that moves between A and B.
  ctx.fillStyle = c('d')
  ctx.fillRect(shifted ? 230 : 90, shifted ? 250 : 250, 80, 80)
  const family = getComputedStyle(document.body).fontFamily
  ctx.fillStyle = c('ink')
  ctx.font = `bold ${Math.round(H * 0.08)}px ${family}`
  ctx.textBaseline = 'top'
  ctx.fillText(shifted ? 'Version B' : 'Version A', 28, 18)
  ctx.font = `${Math.round(H * 0.05)}px ${family}`
  ctx.fillText('Shapes, text and a square that moved', 28, 360)
  if (shifted) {
    // A faint tint over the whole frame, plus the circle changes colour.
    ctx.globalAlpha = 0.025
    ctx.fillStyle = c('shift')
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
  }
  return canvas
}

export async function makeSample(): Promise<[Source, Source]> {
  const [a, b] = await Promise.all([createImageBitmap(draw(false)), createImageBitmap(draw(true))])
  return [
    { name: 'sample-a.png', bitmap: a },
    { name: 'sample-b.png', bitmap: b },
  ]
}
