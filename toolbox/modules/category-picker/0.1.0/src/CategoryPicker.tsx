// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/category-picker 0.1.0: snapshot of lacuna-components CategoryPicker at 27329c5 by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface CategoryOption {
  id: string
  name: string
  color: string
  icon?: string
}

export interface CategoryPickerProps {
  categories: CategoryOption[]
  value: string | null
  onChange: (categoryId: string | null) => void
  onCreate?: (name: string, color: string) => void
  placeholder?: string
  disabled?: boolean
  defaultOpen?: boolean
  'aria-label'?: string
}

const CREATE_COLOR = 'rgb(107,114,128)'
const CREATE_LABEL = 'New category…'

const space = 'calc(8px * var(--sf))'
const gap = 'calc(8px * var(--sf))'
const type = 'calc(14px * var(--tf))'
const small = 'calc(12px * var(--tf))'

const group: CSSProperties = { position: 'relative', display: 'block', width: '100%' }

const button: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--sans)',
  fontSize: type,
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: space,
  padding: space,
  cursor: 'pointer',
  textAlign: 'left',
  minHeight: 'calc(36px * var(--sf))',
}

const buttonDisabled: CSSProperties = { cursor: 'not-allowed', opacity: 0.6 }

const swatch: CSSProperties = {
  width: 'calc(14px * var(--sf))',
  height: 'calc(14px * var(--sf))',
  borderRadius: 'calc(4px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  flex: '0 0 auto',
}

const listbox: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + calc(4px * var(--sf)))',
  left: 0,
  right: 0,
  zIndex: 10,
  margin: 0,
  padding: 'calc(4px * var(--sf))',
  listStyle: 'none',
  background: 'var(--paper-deep)',
  color: 'var(--ink)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: space,
  boxShadow: '0 calc(4px * var(--sf)) calc(12px * var(--sf)) rgba(0, 0, 0, 0.12)',
  overflow: 'auto',
  maxHeight: 'calc(240px * var(--sf))',
}

const option: (focused: boolean, selected: boolean) => CSSProperties = (focused, selected) => ({
  display: 'flex',
  alignItems: 'center',
  gap,
  padding: space,
  borderRadius: space,
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
  fontSize: type,
  color: focused ? 'var(--paper)' : 'var(--ink)',
  background: focused ? 'var(--ink)' : 'transparent',
  fontWeight: selected ? 600 : 400,
  outline: 'none',
})

const iconBox: CSSProperties = {
  width: 'calc(20px * var(--sf))',
  height: 'calc(20px * var(--sf))',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: small,
  flex: '0 0 auto',
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--sans)',
  fontSize: type,
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: space,
  padding: space,
}

const createPanel: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + calc(4px * var(--sf)))',
  left: 0,
  right: 0,
  zIndex: 11,
  background: 'var(--paper-deep)',
  color: 'var(--ink)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: space,
  padding: space,
  boxShadow: '0 calc(4px * var(--sf)) calc(12px * var(--sf)) rgba(0, 0, 0, 0.12)',
}

export function CategoryPicker(props: CategoryPickerProps) {
  const {
    categories,
    value,
    onChange,
    onCreate,
    placeholder = 'Select category',
    disabled = false,
    defaultOpen = false,
    'aria-label': ariaLabel,
  } = props

  const autoId = useId()
  const uid = autoId.replace(/[^a-zA-Z0-9]/g, '')
  const [open, setOpen] = useState(defaultOpen && !disabled)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)

  const selected = value === null ? null : categories.find((c) => c.id === value) ?? null
  const hasCreate = onCreate !== undefined
  const optionCount = categories.length + (hasCreate ? 1 : 0)
  const optionIdAt = (i: number): string => (i >= categories.length ? '__create__' : categories[i]?.id ?? '')

  const visibleText = selected ? selected.name : placeholder
  const buttonLabel = `${ariaLabel ? `${ariaLabel}: ` : ''}${visibleText}`

  function focusOption(index: number) {
    setFocusedIndex(index)
    const el = document.getElementById(`category-option-${uid}-${index}`)
    if (el instanceof HTMLElement) el.focus()
  }

  function openListbox() {
    if (disabled) return
    setCreating(false)
    setDraft('')
    const target = value !== null ? categories.findIndex((c) => c.id === value) : -1
    setFocusedIndex(target >= 0 ? target : 0)
    setOpen(true)
    requestAnimationFrame(() => {
      const el = document.getElementById(`category-option-${uid}-${target >= 0 ? target : 0}`)
      if (el instanceof HTMLElement) el.focus()
    })
  }

  function closeListbox(refocus = true) {
    setOpen(false)
    setCreating(false)
    setDraft('')
    setFocusedIndex(-1)
    if (refocus) buttonRef.current?.focus()
  }

  function commit(index: number) {
    const id = optionIdAt(index)
    if (!id) return
    if (id === '__create__') {
      setCreating(true)
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }
    onChange(id)
    closeListbox()
  }

  function handleButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        closeListbox()
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (open) {
        if (event.key === 'ArrowDown') focusOption(Math.min(optionCount - 1, activeOptionIndex() + 1))
        else if (event.key === 'ArrowUp') focusOption(Math.max(0, activeOptionIndex() - 1))
        else commit(activeOptionIndex())
      } else openListbox()
    }
  }

  function activeOptionIndex(): number {
    if (focusedIndex >= 0) return focusedIndex
    const id = document.activeElement?.id ?? ''
    const match = new RegExp(`^category-option-${uid}-(\\d+)$`).exec(id)
    return match ? Number(match[1]) : 0
  }

  function handleListboxKeyDown(event: ReactKeyboardEvent<HTMLUListElement>) {
    if (creating) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusOption(Math.min(optionCount - 1, activeOptionIndex() + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        focusOption(Math.max(0, activeOptionIndex() - 1))
        break
      case 'Home':
        event.preventDefault()
        focusOption(0)
        break
      case 'End':
        event.preventDefault()
        focusOption(optionCount - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(activeOptionIndex())
        break
      case 'Escape':
        event.preventDefault()
        closeListbox()
        break
      default:
        event.preventDefault()
        break
    }
  }

  function handleCreateKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      const name = draft.trim()
      if (onCreate && name !== '') onCreate(name, CREATE_COLOR)
      closeListbox()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeListbox()
    }
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const groupEl = groupRef.current
      if (!groupEl) return
      if (groupEl.contains(event.target as Node)) return
      closeListbox(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  return (
    <div ref={groupRef} data-category-picker style={group}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={buttonLabel}
        aria-disabled={disabled ? true : undefined}
        aria-haspopup="listbox"
        aria-expanded={open ? true : false}
        onClick={() => {
          if (disabled) return
          if (open) closeListbox(false)
          else openListbox()
        }}
        onKeyDown={handleButtonKeyDown}
        style={{ ...button, ...(disabled ? buttonDisabled : null) }}
      >
        {selected ? (
          <>
            <span aria-hidden="true" style={{ ...swatch, background: selected.color }} />
            {selected.icon ? (
              <span aria-hidden="true" style={iconBox}>
                {selected.icon}
              </span>
            ) : null}
            <span>{selected.name}</span>
          </>
        ) : (
          <span>{placeholder}</span>
        )}
      </button>
      {open && !creating && (
        <ul
          role="listbox"
          aria-label={ariaLabel ? `${ariaLabel} categories` : 'Categories'}
          style={listbox}
          onKeyDown={handleListboxKeyDown}
        >
          {categories.map((category, index) => {
            const isSelected = category.id === value
            const isFocused = focusedIndex === index
            return (
              <li
                key={category.id}
                id={`category-option-${uid}-${index}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => commit(index)}
                style={option(isFocused, isSelected)}
              >
                <span style={{ ...swatch, background: category.color }} aria-hidden="true" />
                {category.icon ? (
                  <span style={iconBox} aria-hidden="true">
                    {category.icon}
                  </span>
                ) : null}
                <span>{category.name}</span>
              </li>
            )
          })}
          {hasCreate && (
            <li
              id={`category-option-${uid}-${categories.length}`}
              role="option"
              aria-selected={false}
              tabIndex={-1}
              onClick={() => commit(categories.length)}
              style={option(focusedIndex === categories.length, false)}
            >
              <span style={iconBox} aria-hidden="true">
                +
              </span>
              <span>{CREATE_LABEL}</span>
            </li>
          )}
        </ul>
      )}
      {open && creating && (
        <div style={createPanel}>
          <input
            ref={inputRef}
            type="text"
            aria-label="New category name"
            value={draft}
            placeholder="New category name"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleCreateKeyDown}
            style={input}
          />
        </div>
      )}
    </div>
  )
}
