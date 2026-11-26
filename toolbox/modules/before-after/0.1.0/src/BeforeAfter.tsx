// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/before-after 0.1.0: snapshot of lacuna-components BeforeAfter at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
// Includes logic adapted from the open-source project credited in NOTICE.md, under its licence.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react'

export interface BeforeAfterProps {
  /** Content for the left/before side. */
  before: React.ReactNode
  /** Content for the right/after side. */
  after: React.ReactNode
  /** Comparison mode. Default "slider". */
  mode?: 'slider' | 'side-by-side'
  /** Initial slider position as a fraction 0–1. Default 0.5. */
  initialPosition?: number
  /** Accessible label for the slider handle. Default "Comparison slider". */
  ariaLabel?: string
  /** Minimum height in scale units (multiplied by var(--sf)). Default 12. */
  minHeight?: number
  /** Whether the slider is disabled. Default false. */
  disabled?: boolean
}

const STEP = 5
const DEFAULT_LABEL = 'Comparison slider'
const GROUP_LABEL = 'Before and after comparison'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toPercent(fraction: number): number {
  return Math.round(clamp(fraction, 0, 1) * 100)
}

function toFraction(percent: number): number {
  return clamp(percent, 0, 100) / 100
}

const base: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
}

export function BeforeAfter(props: BeforeAfterProps): React.ReactElement {
  const {
    before,
    after,
    mode = 'slider',
    initialPosition = 0.5,
    ariaLabel = DEFAULT_LABEL,
    minHeight = 12,
    disabled = false,
  } = props

  const uid = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  const [percent, setPercent] = useState(() => toPercent(initialPosition))
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setPercent(toPercent(initialPosition))
  }, [initialPosition])

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current
      if (!container || disabled) return
      const rect = container.getBoundingClientRect()
      if (rect.width <= 0) return
      const fraction = (clientX - rect.left) / rect.width
      setPercent(toPercent(fraction))
    },
    [disabled],
  )

  useEffect(() => {
    if (!dragging) return
    function onMove(event: MouseEvent) {
      updateFromClientX(event.clientX)
    }
    function onUp() {
      setDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, updateFromClientX])

  const onHandleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    setDragging(true)
    updateFromClientX(event.clientX)
  }

  const onTrackMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    setDragging(true)
    updateFromClientX(event.clientX)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown': {
        event.preventDefault()
        setPercent((p) => clamp(p - STEP, 0, 100))
        break
      }
      case 'ArrowRight':
      case 'ArrowUp': {
        event.preventDefault()
        setPercent((p) => clamp(p + STEP, 0, 100))
        break
      }
      case 'Home': {
        event.preventDefault()
        setPercent(0)
        break
      }
      case 'End': {
        event.preventDefault()
        setPercent(100)
        break
      }
    }
  }

  const left = `${percent}%`
  const containerMinHeight = `calc(${minHeight}px * var(--sf))`

  if (mode === 'side-by-side') {
    return (
      <div
        role="group"
        aria-label={GROUP_LABEL}
        style={{
          ...base,
          display: 'flex',
          gap: 'calc(16px * var(--sf))',
          minHeight: containerMinHeight,
          border: 'calc(1px * var(--sf)) solid var(--hair)',
          borderRadius: 'calc(8px * var(--sf))',
          padding: 'calc(16px * var(--sf))',
          background: 'var(--paper)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 'calc(10px * var(--tf))',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Before
          </span>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: `calc(${Math.max(minHeight - 6, 4)}px * var(--sf))` }}>
            {before}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 'calc(10px * var(--tf))',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            After
          </span>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: `calc(${Math.max(minHeight - 6, 4)}px * var(--sf))` }}>
            {after}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        ...base,
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(8px * var(--sf))',
      }}
    >
      <div
        ref={containerRef}
        onMouseDown={onTrackMouseDown}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: containerMinHeight,
          overflow: 'hidden',
          border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
          borderRadius: 'calc(8px * var(--sf))',
          background: 'var(--paper)',
          cursor: disabled ? 'default' : 'col-resize',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {after}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: left,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {before}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left,
            width: 0,
            transform: 'translateX(-50%)',
            background: 'var(--ink)',
          }}
        />
        <div
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : 0}
          onMouseDown={onHandleMouseDown}
          onKeyDown={onKeyDown}
          style={{
            position: 'absolute',
            top: '50%',
            left,
            transform: 'translate(-50%, -50%)',
            width: 'calc(32px * var(--sf))',
            height: 'calc(32px * var(--sf))',
            borderRadius: '50%',
            background: 'var(--ink)',
            border: 'calc(2px * var(--sf)) solid var(--paper)',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'default' : 'grab',
            outline: 'none',
          }}
        >
          <div
            style={{
              width: 'calc(14px * var(--sf))',
              height: 'calc(2px * var(--sf))',
              background: 'var(--paper)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
