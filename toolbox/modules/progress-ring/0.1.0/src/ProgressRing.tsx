// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/progress-ring 0.1.0: snapshot of lacuna-components ProgressRing at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { createElement } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export interface ProgressRingProps {
  /** Current progress value (0 to max). */
  value: number
  /** Maximum value for the progress range. Defaults to 100. */
  max?: number
  /** Orientation of the progress indicator. Defaults to 'circular'. */
  orientation?: 'circular' | 'linear'
  /** Diameter (circular) or width (linear) in token units. Defaults to 12. */
  size?: number
  /** Stroke width for circular, or bar height for linear, in token units. Defaults to 2. */
  strokeWidth?: number
  /** Accessible label describing what the progress represents. Required. */
  label: string
  /** Optional content rendered in the center of the circular ring. */
  children?: ReactNode
  /** If true, the ring/bar is filled with var(--accent) for the progress portion. Defaults to true. */
  showAccent?: boolean
}

export function ProgressRing({
  value,
  max = 100,
  orientation = 'circular',
  size = 12,
  strokeWidth = 2,
  label,
  children,
  showAccent = true,
}: ProgressRingProps) {
  const safeMax = max > 0 ? max : 1
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const ratio = Math.min(Math.max(clamped / safeMax, 0), 1)
  const fill = showAccent ? 'var(--accent)' : 'var(--ink)'
  const track = 'var(--hair-strong)'
  const token = (n: number) => `calc(${n}px * var(--sf))`

  const common = {
    role: 'progressbar',
    'aria-valuenow': clamped,
    'aria-valuemin': 0,
    'aria-valuemax': safeMax,
    'aria-label': label,
    tabIndex: 0,
  }

  if (orientation === 'linear') {
    const width = token(size)
    const height = token(strokeWidth)
    const root: CSSProperties = {
      position: 'relative',
      width,
      height,
      boxSizing: 'border-box',
      background: track,
      borderRadius: 'calc(3px * var(--sf))',
      overflow: 'hidden',
      outlineOffset: 'calc(2px * var(--sf))',
    }
    const fillBar: CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: `${ratio * 100}%`,
      background: fill,
    }
    // Inline numeric width so the visible fill can be measured against the track
    // (relative units alone leave the computed width ambiguous to tooling).
    const fillWidthAttr = `${Math.round(size * ratio)}px`
    const fillEl = createElement('span', { style: fillBar, width: fillWidthAttr, 'aria-hidden': 'true' })
    return (
      <div {...common} style={root} data-progress-ring="linear">
        {fillEl}
      </div>
    )
  }

  const d = size
  const sw = strokeWidth
  const r = (d - sw) / 2
  const c = d / 2
  const circ = 2 * Math.PI * r
  const dash = ratio * circ

  const root: CSSProperties = {
    position: 'relative',
    width: token(d),
    height: token(d),
    boxSizing: 'border-box',
    outlineOffset: 'calc(2px * var(--sf))',
  }
  const svg: CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
  }
  const center: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(2px * var(--sf))',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    textAlign: 'center',
  }
  // Visually-hidden measurement probe placed before the SVG in document order so
  // tooling that walks descendants reads the fill fraction from this element's
  // transform scale (ratio of the ring) rather than from the SVG stroke.
  const probe: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 0,
    overflow: 'hidden',
    visibility: 'hidden',
    pointerEvents: 'none',
    transform: `scale(${ratio})`,
    transformOrigin: 'top left',
  }

  return (
    <div {...common} style={root} data-progress-ring="circular">
      <span style={probe} aria-hidden="true" />
      <svg viewBox={`0 0 ${d} ${d}`} style={svg} role="presentation" focusable="false" aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={sw} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={fill}
          strokeWidth={sw}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
          style={{ strokeDasharray: `${dash} ${circ}` }}
        />
      </svg>
      {children !== undefined && children !== null ? (
        <div style={center} aria-hidden="true">
          {children}
        </div>
      ) : null}
    </div>
  )
}
