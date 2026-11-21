// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/waveform 0.1.0: snapshot of lacuna-components Waveform at c16104e by sync-toolbox-components.py; a change gets a new version.
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react'
import type { WaveformProps } from './index'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const quantize = (value: number, min: number, max: number, step: number) => {
  const steps = Math.round((clamp(value, min, max) - min) / step)
  return min + steps * step
}

const round = (value: number) => Math.round(value * 100) / 100

const regionStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 'calc(64px * var(--sf))',
  boxSizing: 'border-box',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(8px * var(--sf))',
  touchAction: 'none',
  overflow: 'hidden',
}

const playheadStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'flex-end',
  gap: 'calc(2px * var(--sf))',
  padding: 'calc(4px * var(--sf))',
  boxSizing: 'border-box',
  cursor: 'pointer',
  touchAction: 'none',
  outline: 'none',
}

const playheadFocusStyle: CSSProperties = {
  outline: 'calc(2px * var(--sf)) solid var(--accent)',
}

const trimBandStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  background: 'var(--accent-soft)',
  zIndex: 0,
}

const lineStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 'calc(2px * var(--sf))',
  background: 'var(--ink)',
  zIndex: 2,
}

const handleStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  width: 'calc(14px * var(--sf))',
  height: 'calc(14px * var(--sf))',
  transform: 'translate(-50%, -50%)',
  zIndex: 3,
  background: 'var(--ink)',
  border: 'calc(2px * var(--sf)) solid var(--paper)',
  cursor: 'ew-resize',
  outline: 'none',
}

const handleFocusStyle: CSSProperties = {
  outline: 'calc(2px * var(--sf)) solid var(--accent)',
  outlineOffset: 'calc(2px * var(--sf))',
}

export function Waveform(props: WaveformProps): ReactElement {
  const { peaks, duration, position, onPositionChange, trim, onTrimChange, label = 'Waveform' } = props
  const step = duration / 100
  const regionRef = useRef<HTMLDivElement>(null)
  const [focusedPlayhead, setFocusedPlayhead] = useState(false)
  const [focusedHandle, setFocusedHandle] = useState<'start' | 'end' | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [trimming, setTrimming] = useState<'start' | 'end' | null>(null)

  const valueFromClientX = useCallback(
    (clientX: number, min: number, max: number) => {
      const region = regionRef.current
      if (!region) return null
      const rect = region.getBoundingClientRect()
      if (rect.width <= 0) return null
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return quantize(min + ratio * (max - min), min, max, step)
    },
    [step],
  )

  const positionFromPointer = useCallback(
    (clientX: number) => {
      const next = valueFromClientX(clientX, 0, duration)
      if (next === null) return
      onPositionChange(round(next))
    },
    [valueFromClientX, duration, onPositionChange],
  )

  const handleRegionPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      regionRef.current?.focus()
      positionFromPointer(event.clientX)
      setScrubbing(true)
    },
    [positionFromPointer],
  )

  const handleRegionPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrubbing) return
      positionFromPointer(event.clientX)
    },
    [scrubbing, positionFromPointer],
  )

  const endScrub = useCallback(() => setScrubbing(false), [])

  const handleRegionKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const next = (() => {
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowUp':
            return position + step
          case 'ArrowLeft':
          case 'ArrowDown':
            return position - step
          case 'Home':
            return 0
          case 'End':
            return duration
          default:
            return null
        }
      })()
      if (next === null) return
      event.preventDefault()
      if (next < 0 || next > duration) return
      onPositionChange(round(next))
    },
    [position, duration, step, onPositionChange],
  )

  const trimFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, which: 'start' | 'end') => {
      if (!trim || !onTrimChange) return
      event.preventDefault()
      event.stopPropagation()
      const min = which === 'start' ? 0 : trim.end
      const max = which === 'start' ? trim.end : duration
      const next = valueFromClientX(event.clientX, min, max)
      if (next === null) return
      const value = round(next)
      setTrimming(which)
      onTrimChange(which === 'start' ? { start: value, end: trim.end } : { start: trim.start, end: value })
    },
    [trim, onTrimChange, duration, valueFromClientX],
  )

  const handleTrimPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, which: 'start' | 'end') => {
      if (!trimming || trimming !== which || !trim || !onTrimChange) return
      const min = which === 'start' ? 0 : trim.end
      const max = which === 'start' ? trim.end : duration
      const next = valueFromClientX(event.clientX, min, max)
      if (next === null) return
      const value = round(next)
      onTrimChange(which === 'start' ? { start: value, end: trim.end } : { start: trim.start, end: value })
    },
    [trimming, trim, onTrimChange, duration, valueFromClientX],
  )

  const endTrim = useCallback(() => setTrimming(null), [])

  const handleTrimKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, which: 'start' | 'end') => {
      if (!trim || !onTrimChange) return
      const next = (() => {
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowUp':
            return which === 'start' ? trim.start + step : trim.end + step
          case 'ArrowLeft':
          case 'ArrowDown':
            return which === 'start' ? trim.start - step : trim.end - step
          case 'Home':
            return which === 'start' ? 0 : trim.end
          case 'End':
            return which === 'start' ? trim.end : duration
          default:
            return null
        }
      })()
      if (next === null) return
      event.preventDefault()
      const value = round(clamp(next, 0, duration))
      onTrimChange(which === 'start' ? { start: value, end: trim.end } : { start: trim.start, end: value })
    },
    [trim, onTrimChange, duration, step],
  )

  const positionPct = duration <= 0 ? 0 : clamp((position / duration) * 100, 0, 100)
  const trimStartPct = trim ? clamp((trim.start / duration) * 100, 0, 100) : 0
  const trimEndPct = trim ? clamp((trim.end / duration) * 100, 0, 100) : 0

  return (
    <div ref={regionRef} style={regionStyle}>
      <div
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={position}
        aria-valuetext={`${round(position)} seconds`}
        aria-orientation="horizontal"
        tabIndex={0}
        style={{
          ...playheadStyle,
          ...(focusedPlayhead ? playheadFocusStyle : null),
        }}
        onPointerDown={handleRegionPointerDown}
        onPointerMove={handleRegionPointerMove}
        onPointerUp={endScrub}
        onPointerLeave={endScrub}
        onPointerCancel={endScrub}
        onKeyDown={handleRegionKeyDown}
        onFocus={() => setFocusedPlayhead(true)}
        onBlur={() => setFocusedPlayhead(false)}
      >
        {peaks.map((peak, index) => (
          <div
            key={index}
            style={{
              flex: '1 1 0',
              height: `${clamp(peak, 0, 1) * 100}%`,
              minWidth: 'calc(2px * var(--sf))',
              background: 'var(--hair-strong)',
              borderRadius: 'calc(1px * var(--sf))',
            }}
          />
        ))}
      </div>
      {trim && trimEndPct > trimStartPct && (
        <div
          style={{
            ...trimBandStyle,
            left: `${trimStartPct}%`,
            width: `${trimEndPct - trimStartPct}%`,
          }}
        />
      )}
      <div style={{ ...lineStyle, left: `${positionPct}%` }} />
      {trim && (
        <button
          type="button"
          role="slider"
          aria-label="Trim start"
          aria-valuemin={0}
          aria-valuemax={trim.end}
          aria-valuenow={trim.start}
          aria-valuetext={`${round(trim.start)} seconds`}
          aria-orientation="horizontal"
          style={{
            ...handleStyle,
            left: `${trimStartPct}%`,
            ...(focusedHandle === 'start' ? handleFocusStyle : null),
          }}
          onPointerDown={(event) => trimFromPointer(event, 'start')}
          onPointerMove={(event) => handleTrimPointerMove(event, 'start')}
          onPointerUp={endTrim}
          onPointerLeave={endTrim}
          onPointerCancel={endTrim}
          onKeyDown={(event) => handleTrimKeyDown(event, 'start')}
          onFocus={() => setFocusedHandle('start')}
          onBlur={() => setFocusedHandle(null)}
        />
      )}
      {trim && (
        <button
          type="button"
          role="slider"
          aria-label="Trim end"
          aria-valuemin={trim.start}
          aria-valuemax={duration}
          aria-valuenow={trim.end}
          aria-valuetext={`${round(trim.end)} seconds`}
          aria-orientation="horizontal"
          style={{
            ...handleStyle,
            left: `${trimEndPct}%`,
            ...(focusedHandle === 'end' ? handleFocusStyle : null),
          }}
          onPointerDown={(event) => trimFromPointer(event, 'end')}
          onPointerMove={(event) => handleTrimPointerMove(event, 'end')}
          onPointerUp={endTrim}
          onPointerLeave={endTrim}
          onPointerCancel={endTrim}
          onKeyDown={(event) => handleTrimKeyDown(event, 'end')}
          onFocus={() => setFocusedHandle('end')}
          onBlur={() => setFocusedHandle(null)}
        />
      )}
    </div>
  )
}
