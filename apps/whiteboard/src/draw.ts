import { PAINT, WHITE } from './colors'

export interface StrokeLike {
  tool: 'brush' | 'eraser'
  color: string
  size: number
  points: { x: number; y: number }[]
}

export function paintColor(color: string): string {
  return (PAINT as Record<string, string>)[color] ?? (PAINT as Record<string, string>).black
}

export function drawAll(ctx: CanvasRenderingContext2D, width: number, height: number, strokes: StrokeLike[]) {
  ctx.clearRect(0, 0, width, height)
  for (const stroke of strokes) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = stroke.tool === 'eraser' ? WHITE : paintColor(stroke.color)
    ctx.lineWidth = stroke.size
    ctx.beginPath()
    const pts = stroke.points
    if (pts.length === 0) continue
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
  }
}
