import type { DiagramState, Shape } from './host'
import {
  CANVAS_BG,
  CANVAS_SELECTED,
  CANVAS_STROKE,
  CONNECTOR_DOT,
  CONNECTOR_LINE,
  LABEL_FONT,
  LABEL_INK,
  SHAPE_COLORS,
} from './colors'

export const CANVAS_W = 960
export const CANVAS_H = 520

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function center(shape: Shape): { x: number; y: number } {
  return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 }
}

export function drawDiagram(
  canvas: HTMLCanvasElement,
  state: DiagramState,
  selectedId: string | null = null,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  canvas.width = CANVAS_W * dpr
  canvas.height = CANVAS_H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle = CANVAS_BG
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const byId = new Map(state.shapes.map((s) => [s.id, s] as const))
  const connectors = state.connectors ?? []
  for (const connector of connectors) {
    const from = byId.get(connector.from)
    const to = byId.get(connector.to)
    if (!from || !to) continue
    const a = center(from)
    const b = center(to)
    const mx = (a.x + b.x) / 2
    ctx.strokeStyle = CONNECTOR_LINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(mx, a.y)
    ctx.lineTo(mx, b.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.fillStyle = CONNECTOR_DOT
    ctx.beginPath()
    ctx.arc(mx, b.y, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const shape of state.shapes) {
    const fill = SHAPE_COLORS[shape.color]
    const isSel = shape.id === selectedId
    if (shape.kind === 'rect') {
      roundRectPath(ctx, shape.x, shape.y, shape.w, shape.h, 6)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = isSel ? CANVAS_SELECTED : CANVAS_STROKE
      ctx.lineWidth = isSel ? 3 : 1.5
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.ellipse(
        shape.x + shape.w / 2,
        shape.y + shape.h / 2,
        shape.w / 2,
        shape.h / 2,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = fill
      ctx.fill()
      ctx.strokeStyle = isSel ? CANVAS_SELECTED : CANVAS_STROKE
      ctx.lineWidth = isSel ? 3 : 1.5
      ctx.stroke()
    }
    const label = shape.label.trim() !== '' ? shape.label : 'Shape'
    ctx.fillStyle = LABEL_INK
    ctx.font = LABEL_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, shape.x + shape.w / 2, shape.y + shape.h / 2)
  }
}

export function exportPng(state: DiagramState, file = 'flowchart.png'): void {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  drawDiagram(canvas, state)
  canvas.toBlob((blob) => {
    if (blob) {
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = file
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    }
  }, 'image/png')
}
