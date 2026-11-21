// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import type { CSSProperties } from 'react'
import type { YearRow } from './retirement'

type Props = {
  rows: YearRow[]
  width?: number
  height?: number
}

const CHART_MAX_LABELS = 6

/**
 * A line chart of the yearly balances. Every vertex is a <circle data-point="Year n">
 * element so the data can be located without scraping geometry.
 */
export function RetirementChart({ rows, width = 320, height = 200 }: Props) {
  if (rows.length === 0) {
    return (
      <div className="lc-mono" role="img" aria-label="Balance by year">
        No data
      </div>
    )
  }

  const values = rows.map((row) => row.balance)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = 16
  const span = max - min || 1
  const x = (idx: number) =>
    rows.length === 1 ? width / 2 : pad + (idx / (rows.length - 1)) * (width - pad * 2)
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)
  const points = rows.map((row, idx) => `${x(idx).toFixed(1)},${y(row.balance).toFixed(1)}`).join(' ')

  const step = Math.max(1, Math.ceil(rows.length / CHART_MAX_LABELS))
  const seen = new Set<number>()
  const labels: number[] = []
  for (let i = 0; i < rows.length; i += step) {
    if (!seen.has(i)) {
      seen.add(i)
      labels.push(i)
    }
  }
  const last = rows.length - 1
  if (!seen.has(last)) {
    seen.add(last)
    labels.push(last)
  }

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`Balance by year, ${rows.length} points`}
      data-point="chart"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        style={{ strokeLinejoin: 'round' } as CSSProperties}
      />
      {rows.map((row, idx) => (
        <circle
          key={row.year}
          data-year={row.year}
          cx={x(idx)}
          cy={y(row.balance)}
          r={3}
          fill="var(--accent)"
        />
      ))}
      {labels.map((idx) => (
        <text
          key={idx}
          x={x(idx)}
          y={height - 2}
          textAnchor="middle"
          fontSize="10"
          fill="var(--ink)"
        >
          Y{rows[idx].year}
        </text>
      ))}
    </svg>
  )
}
