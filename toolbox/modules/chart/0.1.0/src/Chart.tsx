// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/chart 0.1.0: snapshot of lacuna-components Chart at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react'

export interface ChartDataPoint {
  label: string
  value: number
}

export interface ChartProps {
  type: 'line' | 'bar' | 'donut'
  data: readonly ChartDataPoint[]
  title?: string
  width?: number
  height?: number
  ariaLabel?: string
}

const DEFAULT_WIDTH = 320
const DEFAULT_HEIGHT = 200
const PAD_X = 48
const PAD_TOP = 20
const PAD_BOTTOM = 48
const TAU = Math.PI * 2

const FILL: Readonly<Record<number, string>> = {
  0: 'var(--ink)',
  1: 'hsl(24 55% 52%)',
  2: 'hsl(205 45% 48%)',
  3: 'hsl(150 30% 42%)',
  4: 'hsl(45 70% 48%)',
  5: 'hsl(275 40% 55%)',
}

function fill(i: number): string {
  return FILL[i] ?? 'var(--ink)'
}

interface Tip {
  text: string
  x: number
  y: number
}

export function Chart({ type, data, title, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, ariaLabel }: ChartProps) {
  const [tip, setTip] = useState<Tip | null>(null)

  const max = data.reduce((m, d) => (d.value > m ? d.value : m), 0)
  const total = data.reduce((s, d) => s + d.value, 0)

  const show = (e: ReactMouseEvent, i: number) => {
    const point = data[i]
    if (point === undefined) return
    setTip({ text: `${point.label}: ${point.value}`, x: e.clientX, y: e.clientY })
  }
  const hide = () => setTip(null)

  const label = ariaLabel ?? title ?? 'Chart'

  if (data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--ink)"
          fontFamily="var(--mono)"
          fontSize={12}
        >
          No data
        </text>
      </svg>
    )
  }

  const plotH = height - PAD_TOP - PAD_BOTTOM
  const plotW = width - PAD_X * 2
  const step = plotW / data.length

  let body: ReactElement

  if (type === 'bar') {
    const barW = Math.max(step * 0.55, 1)
    body = (
      <g>
        <line x1={PAD_X} y1={height - PAD_BOTTOM} x2={width - PAD_X} y2={height - PAD_BOTTOM} stroke="var(--hair-strong)" strokeWidth={1} />
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * plotH : 0
          const x = PAD_X + i * step + (step - barW) / 2
          const y = height - PAD_BOTTOM - h
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={fill(i)}
                data-label={d.label}
                onMouseEnter={(e) => show(e, i)}
                onMouseLeave={hide}
              />
              <text
                x={PAD_X + i * step + step / 2}
                y={height - PAD_BOTTOM + 14}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize={10}
                fontFamily="var(--mono)"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </g>
    )
  } else if (type === 'line') {
    const pts = data.map((d, i) => {
      const x = data.length === 1 ? width / 2 : PAD_X + i * step + step / 2
      const y = max > 0 ? height - PAD_BOTTOM - (d.value / max) * plotH : height - PAD_BOTTOM
      return { x, y, i, d }
    })
    const points = pts.map((p) => `${p.x},${p.y}`).join(' ')
    body = (
      <g>
        <line x1={PAD_X} y1={height - PAD_BOTTOM} x2={width - PAD_X} y2={height - PAD_BOTTOM} stroke="var(--hair-strong)" strokeWidth={1} />
        <polyline points={points} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
        {pts.map((p) => (
          <g key={p.i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="var(--ink)"
              data-label={p.d.label}
              onMouseEnter={(e) => show(e, p.i)}
              onMouseLeave={hide}
            />
            <text x={p.x} y={height - PAD_BOTTOM + 14} textAnchor="middle" fill="var(--ink)" fontSize={10} fontFamily="var(--mono)">
              {p.d.label}
            </text>
          </g>
        ))}
      </g>
    )
  } else {
    const cx = width / 2
    const cy = height / 2
    const R = Math.min(width, height) / 2 - 10
    const r = R * 0.55
    const full = data.length === 1
    let acc = 0
    body = (
      <g>
        {data.map((d, i) => {
          const a0 = total > 0 ? (acc / total) * TAU : 0
          acc += d.value
          const a1 = total > 0 ? (acc / total) * TAU : 0
          const percent = total > 0 ? Math.round((d.value / total) * 100) : 0
          let dPath: string
          if (full) {
            dPath =
              `M ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} Z ` +
              `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`
          } else {
            const large = a1 - a0 > Math.PI ? 1 : 0
            const x0 = cx + R * Math.cos(a0)
            const y0 = cy + R * Math.sin(a0)
            const x1 = cx + R * Math.cos(a1)
            const y1 = cy + R * Math.sin(a1)
            const xi1 = cx + r * Math.cos(a1)
            const yi1 = cy + r * Math.sin(a1)
            const xi0 = cx + r * Math.cos(a0)
            const yi0 = cy + r * Math.sin(a0)
            dPath = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`
          }
          return (
            <path
              key={i}
              d={dPath}
              fill={fill(i)}
              fillRule="evenodd"
              data-label={d.label}
              data-percent={String(percent)}
              onMouseEnter={(e) => show(e, i)}
              onMouseLeave={hide}
            />
          )
        })}
      </g>
    )
  }

  const tipAbove = tip ? tip.y > 34 : true

  return (
    <>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {body}
      </svg>
      {tip ? (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: `${tip.x}px`,
            top: `${tipAbove ? tip.y - 8 : tip.y + 12}px`,
            transform: tipAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--mono)',
            fontSize: 'calc(11px * var(--tf))',
            padding: 'calc(3px * var(--sf)) calc(7px * var(--sf))',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {tip.text}
        </div>
      ) : null}
    </>
  )
}
