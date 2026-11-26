// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/export-menu 0.1.0: snapshot of lacuna-components ExportMenu at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { saveBlob } from '@lacuna/file-save-open'
import type { ExportMenuProps, ExportOption } from './types'

const space = 'calc(8px * var(--sf))'

const styles: {
  wrapper: CSSProperties
  trigger: (disabled: boolean) => CSSProperties
  menu: CSSProperties
  item: (active: boolean) => CSSProperties
} = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
  },
  trigger: (disabled: boolean): CSSProperties => ({
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--paper)',
    background: 'var(--ink)',
    border: 'calc(1px * var(--sf)) solid var(--ink)',
    borderRadius: 'calc(8px * var(--sf))',
    padding: 'calc(8px * var(--sf))',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }),
  menu: {
    position: 'absolute',
    top: 'calc(100% + calc(4px * var(--sf)))',
    left: 0,
    zIndex: 10,
    margin: 0,
    padding: 'calc(4px * var(--sf))',
    listStyle: 'none',
    minWidth: 'calc(160px * var(--sf))',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: 'calc(8px * var(--sf))',
    boxShadow: '0 calc(4px * var(--sf)) calc(12px * var(--sf)) rgba(0, 0, 0, 0.12)',
  },
  item: (active: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: active ? 'var(--paper)' : 'var(--ink)',
    background: active ? 'var(--ink)' : 'transparent',
    border: 'none',
    borderRadius: 'calc(8px * var(--sf))',
    padding: 'calc(8px * var(--sf))',
    cursor: 'pointer',
  }),
}

function toBlob(data: string | Blob, mimeType: string): Blob {
  if (data instanceof Blob) return data
  return new Blob([data], { type: mimeType })
}

export function ExportMenu({
  options,
  fileName = 'export',
  ariaLabel = 'Export',
  disabled = false,
  onExport,
  onError,
}: ExportMenuProps) {
  const autoId = useId()
  const menuId = `export-menu-${autoId}`
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setActiveIndex(-1)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const choose = (option: ExportOption) => {
    try {
      const blob = toBlob(option.getData(), option.mimeType)
      saveBlob(blob, { filename: `${fileName}.${option.extension}`, mimeType: option.mimeType })
      onExport?.(option.id)
      setOpen(false)
      setActiveIndex(-1)
      triggerRef.current?.focus()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(option.id, error)
    }
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (options.length > 0) setActiveIndex((index) => (index + 1) % options.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (options.length > 0) setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1))
        break
      case 'Home':
        event.preventDefault()
        if (options.length > 0) setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        if (options.length > 0) setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (activeIndex >= 0 && activeIndex < options.length) {
          const option = options[activeIndex]
          if (option) choose(option)
        }
        break
    }
  }

  const toggle = () => {
    if (disabled) return
    if (open) {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    setOpen(true)
    setActiveIndex(-1)
    requestAnimationFrame(() => {
      menuRef.current?.focus()
    })
  }

  return (
    <div style={styles.wrapper}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-disabled={disabled ? 'true' : 'false'}
        onClick={toggle}
        style={styles.trigger(disabled)}
      >
        {ariaLabel}
      </button>
      {open && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          style={styles.menu}
        >
          {options.map((option, index) => (
            <li key={option.id} role="none">
              <button
                type="button"
                role="menuitem"
                aria-label={option.label}
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                style={styles.item(index === activeIndex)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
