// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/keypad 0.1.0: snapshot of lacuna-components Keypad at 4cddd6c by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'

export interface KeypadKey {
  /** Display label on the key. */
  label: string
  /** Value emitted on activation. */
  value: string
  /** Optional CSS grid column span. Default 1. */
  span?: number
  /** Optional CSS grid row span. Default 1. */
  rowSpan?: number
  /** If true, the key is disabled. */
  disabled?: boolean
}

export interface KeypadProps {
  /** Array of keys to render, in row-major order. */
  keys: KeypadKey[]
  /** Number of columns in the grid. */
  columns: number
  /** Callback when a key is activated (click or matching physical key press). */
  onKey: (value: string) => void
  /** Optional callback when Backspace is pressed (physical or on-screen). */
  onBackspace?: () => void
  /** Optional callback when Enter is pressed. */
  onEnter?: () => void
  /** Accessible label for the keypad region. */
  ariaLabel?: string
}

const token = (n: number) => `calc(${n}px * var(--sf))`
const typeToken = (n: number) => `calc(${n}px * var(--tf))`

const keyDataUrl = (ch: string): string => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>` +
    `<text x='24' y='32' text-anchor='middle' font-family='monospace' font-size='32' fill='currentColor'>` +
    `${ch}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function Keypad({
  keys,
  columns,
  onKey,
  onBackspace,
  onEnter,
  ariaLabel,
}: KeypadProps) {
  const keyMap = useMemo(() => {
    const map = new Map<string, KeypadKey>()
    for (const key of keys) {
      map.set(key.value, key)
    }
    return map
  }, [keys])

  const keyMapRef = useRef(keyMap)
  const onKeyRef = useRef(onKey)
  const onBackspaceRef = useRef(onBackspace)
  const onEnterRef = useRef(onEnter)

  keyMapRef.current = keyMap
  onKeyRef.current = onKey
  onBackspaceRef.current = onBackspace
  onEnterRef.current = onEnter

  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        onBackspaceRef.current?.()
        return
      }

      if (event.key === 'Enter') {
        onEnterRef.current?.()
        return
      }

      const match = keyMapRef.current.get(event.key)
      if (match && !match.disabled) {
        const container = containerRef.current
        if (container) {
          const buttons = container.querySelectorAll<HTMLButtonElement>('button')
          for (const btn of buttons) {
            if (btn.getAttribute('aria-label') === match.label) {
              btn.click()
              return
            }
          }
        }
        onKeyRef.current(match.value)
      }
    }
    document.addEventListener('keydown', listener, true)
    return () => {
      document.removeEventListener('keydown', listener, true)
    }
  }, [])

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, auto)`,
    gap: token(2),
    padding: token(3),
    fontFamily: 'var(--sans)',
    outline: 'none',
  }

  const keyBaseStyle: CSSProperties = {
    padding: token(4),
    fontFamily: 'var(--sans)',
    fontSize: typeToken(14),
    color: 'var(--ink)',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    borderRadius: 'calc(2px * var(--sf))',
    cursor: 'pointer',
    textAlign: 'center',
    userSelect: 'none',
    minWidth: token(6),
    minHeight: token(6),
  }

  const disabledStyle: CSSProperties = {
    opacity: 0.45,
    cursor: 'not-allowed',
  }

  const glyphStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'calc(24px * var(--sf))',
    height: 'calc(24px * var(--sf))',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  }

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={ariaLabel}
      style={containerStyle}
    >
      {keys.map((key, index) => {
        const span = key.span ?? 1
        const rowSpan = key.rowSpan ?? 1
        const style: CSSProperties = {
          ...keyBaseStyle,
          gridColumn: `span ${span}`,
          gridRow: `span ${rowSpan}`,
          ...(key.disabled ? disabledStyle : {}),
        }
        const glyph = key.label.length === 1 ? key.label : key.label.slice(0, 1)
        return (
          <button
            key={index}
            type="button"
            aria-label={key.label}
            aria-disabled={key.disabled || undefined}
            disabled={key.disabled}
            style={style}
            onClick={() => {
              if (key.disabled) return
              onKey(key.value)
            }}
          >
            <span
              aria-hidden="true"
              style={{
                ...glyphStyle,
                backgroundImage: `url("${keyDataUrl(glyph)}")`,
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
