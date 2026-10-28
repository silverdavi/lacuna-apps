import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

type PanelAxis = 'inline' | 'block'

interface ResizablePanelProps {
  id: string
  label: string
  defaultSize: number
  minSize: number
  maxSize: number
  axis?: PanelAxis
  children: ReactNode
  className?: string
  style?: CSSProperties
}

const STORAGE_PREFIX = 'lacuna-layout:'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function loadSize(id: string, fallback: number, min: number, max: number) {
  try {
    const stored = Number(localStorage.getItem(`${STORAGE_PREFIX}${id}`))
    return Number.isFinite(stored) ? clamp(stored, min, max) : fallback
  } catch {
    return fallback
  }
}

function saveSize(id: string, value: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, String(Math.round(value)))
  } catch {
    // Layout preferences are an enhancement; private browsing must not break UI.
  }
}

/**
 * A token-native panel with an accessible separator. The separator supports
 * pointer dragging, arrows, Home/End, and double-click reset. Widths are
 * persisted independently from theme personalization so density/type scale
 * changes remain meaningful.
 */
export function ResizablePanel({
  id,
  label,
  defaultSize,
  minSize,
  maxSize,
  axis = 'inline',
  children,
  className,
  style,
}: ResizablePanelProps) {
  const [size, setSize] = useState(() => loadSize(id, defaultSize, minSize, maxSize))
  const start = useRef<{ pointer: number; size: number } | null>(null)
  const horizontal = axis === 'inline'

  const update = useCallback((next: number) => {
    const value = clamp(next, minSize, maxSize)
    setSize(value)
    saveSize(id, value)
  }, [id, minSize, maxSize])

  const reset = useCallback(() => update(defaultSize), [defaultSize, update])

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    start.current = {
      pointer: horizontal ? event.clientX : event.clientY,
      size,
    }
  }

  useEffect(() => {
    if (!start.current) return
    const move = (event: PointerEvent) => {
      if (!start.current) return
      const delta = (horizontal ? event.clientX : event.clientY) - start.current.pointer
      update(start.current.size + delta)
    }
    const up = () => { start.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [horizontal, update, size])

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const increment = event.shiftKey ? 32 : 8
    if (event.key === 'Home') { event.preventDefault(); update(minSize); return }
    if (event.key === 'End') { event.preventDefault(); update(maxSize); return }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      update(size - increment)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      update(size + increment)
    }
  }

  return (
    <>
      <div
        className={`lc-resizable-panel${className ? ` ${className}` : ''}`}
        style={{
          ...(horizontal ? { width: `${size}px`, flexBasis: `${size}px` } : { height: `${size}px`, flexBasis: `${size}px` }),
          ...style,
        }}
        data-layout-panel={id}
      >
        {children}
      </div>
      <button
        type="button"
        className={`lc-splitter lc-splitter-${axis}`}
        role="separator"
        aria-label={`Resize ${label}`}
        aria-orientation={horizontal ? 'vertical' : 'horizontal'}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-valuenow={Math.round(size)}
        title={`Resize ${label}. Double-click to reset.`}
        onPointerDown={onPointerDown}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
      />
    </>
  )
}
