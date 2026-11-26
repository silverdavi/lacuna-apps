// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/color-palette 0.1.0: snapshot of lacuna-components ColorPalette at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from 'react'
import type { ColorPaletteProps } from './index'

const pageFont: CSSProperties = {
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
}

const labelStyle: CSSProperties = {
  ...pageFont,
  fontSize: 'calc(14px * var(--tf))',
  margin: 0,
}

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
}

const gridStyle = (columns: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, auto)`,
  gap: 'calc(6px * var(--sf))',
})

const swatchBase: CSSProperties = {
  width: 'calc(28px * var(--sf))',
  height: 'calc(28px * var(--sf))',
  padding: 0,
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(6px * var(--sf))',
  cursor: 'pointer',
}

const ringStyle: CSSProperties = {
  outline: 'calc(3px * var(--sf)) solid var(--ink)',
  outlineOffset: 'calc(1px * var(--sf))',
}

export function ColorPalette({
  label,
  swatches,
  value,
  onChange,
  columns = 8,
}: ColorPaletteProps): ReactElement {
  const baseId = useId()
  const selected = swatches.findIndex((swatch) => swatch.color === value)
  const selectedIndex = selected === -1 ? 0 : selected
  const [focusedIndex, setFocusedIndex] = useState(selectedIndex)
  const [inside, setInside] = useState(false)
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    setFocusedIndex(selectedIndex)
  }, [selectedIndex])

  const select = useCallback(
    (index: number) => {
      const swatch = swatches[index]
      if (!swatch) return
      setFocusedIndex(index)
      refs.current[index]?.focus()
      if (swatch.color !== value) onChange(swatch.color)
    },
    [swatches, value, onChange],
  )

  const handleFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    const current = event.target as HTMLElement
    setInside(current.closest('[role="radiogroup"]') !== null)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const count = swatches.length
    if (count === 0) return
    let next: number | null = null
    switch (event.key) {
      case 'ArrowRight':
        next = (focusedIndex + 1) % count
        break
      case 'ArrowLeft':
        next = (focusedIndex - 1 + count) % count
        break
      case 'ArrowDown':
        next = (focusedIndex + columns) % count
        break
      case 'ArrowUp':
        next = (focusedIndex - columns + count) % count
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }
    event.preventDefault()
    select(next)
  }

  return (
    <div style={groupStyle}>
      <p id={`${baseId}-label`} style={labelStyle}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${baseId}-label`}
        style={{ ...gridStyle(columns), ...pageFont }}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleFocus}
      >
        {swatches.map((swatch, index) => (
          <button
            key={swatch.name}
            type="button"
            role="radio"
            aria-checked={index === selectedIndex}
            aria-label={swatch.name}
            data-color={swatch.color}
            ref={(el) => {
              refs.current[index] = el
            }}
            tabIndex={index === selectedIndex && inside ? 0 : -1}
            onClick={() => select(index)}
            style={{
              ...swatchBase,
              background: swatch.color,
              ...(index === selectedIndex ? ringStyle : { outline: 'none' }),
            }}
          />
        ))}
      </div>
    </div>
  )
}
