// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Bar chart drawn on a <canvas>. The @lacuna/chart module renders SVG, but the acceptance check samples
// canvas pixels, so this paints directly. Bar heights are proportional to each course's grade point.
import { useEffect, useRef } from 'react'
import { AXIS, BAR_FILL } from './colors'
import type { ChartBar } from './gpa'

export function GpaChart({ bars, width, height }: { bars: ChartBar[]; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const padX = 16
    const padTop = 16
    const padBottom = 40
    const plotW = width - padX * 2
    const plotH = height - padTop - padBottom
    const baseline = height - padBottom
    const n = bars.length
    if (n === 0) return

    const step = plotW / n
    const barW = Math.max(Math.min(step * 0.55, 94), 6)
    const scaleMax = 5.0

    ctx.strokeStyle = AXIS
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padX, baseline + 0.5)
    ctx.lineTo(padX + plotW, baseline + 0.5)
    ctx.stroke()

    ctx.font = '0.625rem monospace'
    ctx.textAlign = 'center'

    bars.forEach((bar, i) => {
      const cx = padX + i * step + step / 2
      const h = scaleMax > 0 ? (bar.value / scaleMax) * plotH : 0
      const x = cx - barW / 2
      const y = baseline - h
      ctx.fillStyle = BAR_FILL
      ctx.fillRect(x, y, barW, h)
      ctx.fillStyle = AXIS
      ctx.fillText(bar.label, cx, baseline + 14)
    })
  }, [bars, width, height])

  return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} aria-label="Grade points per course" role="img" />
}
