import { useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { money } from './compound'

interface DataPoint {
  label: string
  value: number
}

interface Tip {
  text: string
  x: number
  y: number
}

const PAD_X = 48
const PAD_TOP = 20
const PAD_BOTTOM = 48

export function LineChart({ data, width, height, ariaLabel }: { data: DataPoint[]; width: number; height: number; ariaLabel?: string }) {
  const [tip, setTip] = useState<Tip | null>(null)

  const max = data.reduce((m, d) => (d.value > m ? d.value : m), 0)

  const show = (e: ReactMouseEvent, i: number) => {
    const point = data[i]
    if (point === undefined) return
    setTip({ text: `${point.label}: ${money(point.value)}`, x: e.clientX, y: e.clientY })
  }
  const hide = () => setTip(null)

  const label = ariaLabel ?? 'Chart'

  if (data.length === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }}>
        <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)" fontFamily="var(--mono)" fontSize={12}>
          No data
        </text>
      </svg>
    )
  }

  const plotH = height - PAD_TOP - PAD_BOTTOM
  const plotW = width - PAD_X * 2
  const step = plotW / data.length

  const pts = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : PAD_X + i * step + step / 2
    const y = max > 0 ? height - PAD_BOTTOM - (d.value / max) * plotH : height - PAD_BOTTOM
    return { x, y, i, d }
  })
  const points = pts.map((p) => `${p.x},${p.y}`).join(' ')

  const tipAbove = tip ? tip.y > 34 : true

  return (
    <>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }}>
        <g>
          <line x1={PAD_X} y1={height - PAD_BOTTOM} x2={width - PAD_X} y2={height - PAD_BOTTOM} stroke="var(--hair-strong)" strokeWidth={1} />
          <polyline points={points} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
          {pts.map((p) => (
            <g key={p.i}>
              <circle cx={p.x} cy={p.y} r={4} fill="var(--ink)" data-label={p.d.label} onMouseEnter={(e) => show(e, p.i)} onMouseLeave={hide} />
              <text x={p.x} y={height - PAD_BOTTOM + 14} textAnchor="middle" fill="var(--ink)" fontSize={10} fontFamily="var(--mono)">
                {p.d.label}
              </text>
            </g>
          ))}
        </g>
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
