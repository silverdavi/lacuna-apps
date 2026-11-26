// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/signature-pad 0.1.0: snapshot of lacuna-components SignaturePad at 5271c52 by sync-toolbox-components.py; a change gets a new version.
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { usePointerDraw, type Stroke } from '@lacuna/use-pointer-draw'
import { Button } from '@lacuna/ui'

export type SignatureExportFormat = 'svg' | 'png'

export interface SignaturePadProps {
  onClear?: () => void
  onExport?: (format: SignatureExportFormat, data: string) => void
  width?: number
  height?: number
  disabled?: boolean
  ariaHidden?: boolean
  children?: ReactNode
}

interface Point {
  x: number
  y: number
}

function toPoint(p: { x: number; y: number }): Point {
  return { x: p.x, y: p.y }
}

function strokePath(stroke: Stroke, scale = 1): string {
  const pts = stroke.points.map((p) => toPoint(p))
  if (pts.length === 0) return ''
  if (pts.length === 1) {
    const p = pts[0]
    if (!p) return ''
    const r = (stroke.width * scale * 0.5).toFixed(2)
    return `M${p.x.toFixed(2)},${(p.y - Number(r)).toFixed(2)}a${r},${r} 0 1 0 0.01,0`
  }
  const first = pts[0]
  if (!first) return ''
  const d: string[] = [`M${first.x.toFixed(2)},${first.y.toFixed(2)}`]
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const cur = pts[i]
    if (!prev || !cur) continue
    const mx = ((prev.x + cur.x) / 2).toFixed(2)
    const my = ((prev.y + cur.y) / 2).toFixed(2)
    d.push(`Q${prev.x.toFixed(2)},${prev.y.toFixed(2)} ${mx},${my}`)
  }
  const last = pts[pts.length - 1]
  if (last) d.push(`L${last.x.toFixed(2)},${last.y.toFixed(2)}`)
  return d.join(' ')
}

function serializeSignature(strokes: Stroke[], width: number, height: number): string {
  const paths = strokes
    .map((s) => `  <path d="${strokePath(s)}" fill="none" stroke="var(--ink)" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${paths}\n</svg>`
}

function resolveToken(value: string): string {
  const m = value.match(/^var\((--[\w-]+)\)(.*)$/)
  if (!m) return value
  const css = document.documentElement.style
  const fallback = m[2]?.trim() ?? ''
  return css.getPropertyValue(m[1] ?? '').trim() || fallback || value
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbaToRgb(rgba: string): [number, number, number] | null {
  const m = rgba.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (!m) return null
  return [Math.round(Number(m[1])), Math.round(Number(m[2])), Math.round(Number(m[3]))]
}

function resolveRgb(color: string): [number, number, number] | null {
  const probe = document.createElement('span')
  probe.style.color = color
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe).color
  document.body.removeChild(probe)
  if (computed.startsWith('#')) return hexToRgb(computed)
  return rgbaToRgb(computed)
}

function svgToPng(svg: string, width: number, height: number): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(canvas.toDataURL('image/png'))
  const paperRgb = resolveRgb(resolveToken('var(--paper)')) ?? [244, 239, 230]
  const inkRgb = resolveRgb(resolveToken('var(--ink)')) ?? [26, 26, 26]
  ctx.fillStyle = `rgb(${paperRgb[0]},${paperRgb[1]},${paperRgb[2]})`
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = `rgb(${inkRgb[0]},${inkRgb[1]},${inkRgb[2]})`
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokePathsFrom(svg)) {
    ctx.beginPath()
    stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
  }
  return Promise.resolve(canvas.toDataURL('image/png'))
}

function strokePathsFrom(svg: string): Point[][] {
  const out: Point[][] = []
  const re = /d="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg))) {
    const dAttr = m[1]
    if (!dAttr) continue
    const nums = (dAttr.match(/-?[\d.]+/g) ?? []).map(Number)
    const pts: Point[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i] ?? 0, y: nums[i + 1] ?? 0 })
    if (pts.length > 0) out.push(pts)
  }
  return out
}

const padStyle: CSSProperties = {
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(2px * var(--sf))',
  background: 'var(--paper)',
  overflow: 'hidden',
  touchAction: 'none',
  display: 'block',
  cursor: 'crosshair',
}

export function SignaturePad({
  onClear,
  onExport,
  width = 400,
  height = 200,
  disabled = false,
  ariaHidden = false,
  children,
}: SignaturePadProps) {
  const { surfaceProps, strokes, activeStroke, clear } = usePointerDraw({
    strokeWidth: 2,
    smoothing: 0.5,
    minDistance: 1,
  })
  const [busy, setBusy] = useState(false)

  const all = activeStroke ? [...strokes, activeStroke] : strokes

  function handleClear() {
    if (disabled) return
    clear()
    onClear?.()
  }

  async function handleExport() {
    if (disabled || busy) return
    const svg = serializeSignature(all, width, height)
    setBusy(true)
    try {
      onExport?.('svg', svg)
      onExport?.('png', await svgToPng(svg, width, height))
    } finally {
      setBusy(false)
    }
  }

  const svgStyle: CSSProperties = disabled
    ? { ...padStyle, ...surfaceProps.style, pointerEvents: 'none', cursor: 'not-allowed' }
    : { ...padStyle, ...surfaceProps.style }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }} aria-hidden={ariaHidden || undefined}>
      <svg
        role="img"
        aria-label="Signature pad"
        aria-hidden={ariaHidden || undefined}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={svgStyle}
        {...(disabled
          ? {}
          : {
              onPointerDown: surfaceProps.onPointerDown,
              onPointerMove: surfaceProps.onPointerMove,
              onPointerUp: surfaceProps.onPointerUp,
              onPointerLeave: surfaceProps.onPointerLeave,
              onWheel: surfaceProps.onWheel,
            })}
      >
        <rect x="0" y="0" width={width} height={height} fill="var(--paper)" />
        {all.map((stroke, i) => (
          <path
            key={i}
            d={strokePath(stroke)}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {children}
      <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
        <Button kind="secondary" onClick={handleClear} disabled={disabled} ariaLabel="Clear signature">
          Clear
        </Button>
        <Button kind="secondary" onClick={handleExport} disabled={disabled || busy} ariaLabel="Export as SVG">
          Export as SVG
        </Button>
        <Button kind="secondary" onClick={handleExport} disabled={disabled || busy} ariaLabel="Export as PNG">
          Export as PNG
        </Button>
      </div>
    </div>
  )
}
