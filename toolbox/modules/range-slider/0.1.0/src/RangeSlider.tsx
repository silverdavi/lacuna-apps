// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/range-slider 0.1.0: snapshot of lacuna-components RangeSlider at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
// Includes logic adapted from the open-source project credited in NOTICE.md, under its licence.
import {
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react'
import type { RangeSliderProps } from './index'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const quantize = (value: number, min: number, max: number, step: number) => {
  const steps = Math.round((clamp(value, min, max) - min) / step)
  return min + steps * step
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(8px * var(--sf))',
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  margin: 0,
}

const trackStyle: CSSProperties = {
  position: 'relative',
  flex: 1,
  height: 'calc(28px * var(--sf))',
  display: 'flex',
  alignItems: 'center',
  touchAction: 'none',
  outline: 'none',
}

const trackFocusStyle: CSSProperties = {
  outline: 'calc(2px * var(--sf)) solid var(--accent)',
  outlineOffset: 'calc(2px * var(--sf))',
  borderRadius: 'calc(999px * var(--sf))',
}

const railStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 'calc(4px * var(--sf))',
  borderRadius: 'calc(999px * var(--sf))',
  background: 'var(--hair)',
}

const fillStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  borderRadius: 'inherit',
  background: 'var(--ink)',
}

const thumbStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  width: 'calc(14px * var(--sf))',
  height: 'calc(14px * var(--sf))',
  borderRadius: '50%',
  background: 'var(--ink)',
  border: 'calc(2px * var(--sf)) solid var(--paper)',
  transform: 'translate(-50%, -50%)',
}

const valueStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  minWidth: 'calc(64px * var(--sf))',
  textAlign: 'right',
}

export function RangeSlider(props: RangeSliderProps): ReactElement {
  const { label, value, onChange, min = 0, max = 100, step = 1, format, disabled = false } = props
  const text = format ? format(value) : String(value)
  const id = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return value
      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) return value
      const percentage = clamp((clientX - rect.left) / rect.width, 0, 1)
      return quantize(min + percentage * (max - min), min, max, step)
    },
    [value, min, max, step],
  )

  const emit = useCallback(
    (next: number) => {
      onChange(quantize(next, min, max, step))
    },
    [onChange, min, max, step],
  )

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return
      e.preventDefault()
      trackRef.current?.focus()
      emit(valueFromClientX(e.clientX))
      setDragging(true)
    },
    [disabled, valueFromClientX, emit],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging || disabled) return
      emit(valueFromClientX(e.clientX))
    },
    [dragging, disabled, valueFromClientX, emit],
  )

  const endDrag = useCallback(() => setDragging(false), [])

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      const next = (() => {
        switch (e.key) {
          case 'ArrowRight':
          case 'ArrowUp':
            return value + step
          case 'ArrowLeft':
          case 'ArrowDown':
            return value - step
          case 'Home':
            return min
          case 'End':
            return max
          default:
            return null
        }
      })()
      if (next !== null) {
        e.preventDefault()
        emit(next)
      }
    },
    [disabled, value, step, min, max, emit],
  )

  const percentage = max === min ? 0 : clamp(((value - min) / (max - min)) * 100, 0, 100)

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <div
        ref={trackRef}
        id={id}
        role="slider"
        aria-label={label}
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        aria-disabled={disabled || undefined}
        aria-orientation="horizontal"
        style={{
          ...trackStyle,
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...(focused && !disabled ? trackFocusStyle : null),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <div style={railStyle}>
          <div style={{ ...fillStyle, width: `${percentage}%` }} />
          <div style={{ ...thumbStyle, left: `${percentage}%` }} />
        </div>
      </div>
      <span style={valueStyle} aria-hidden="true">
        {text}
      </span>
    </div>
  )
}
