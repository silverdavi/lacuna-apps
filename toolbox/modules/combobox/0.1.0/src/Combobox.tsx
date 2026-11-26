// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/combobox 0.1.0: snapshot of lacuna-components Combobox at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useId, useMemo, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface ComboboxOption {
  value: string
  label: string
  /** Accessible name for the option; defaults to `label`. */
  name?: string
}

export interface ComboboxProps {
  options: readonly ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  label?: string
}

const box = 'calc(8px * var(--sf))'

const styles: {
  group: CSSProperties
  caption: CSSProperties
  input: CSSProperties
  listbox: CSSProperties
  option: (highlighted: boolean, selected: boolean) => CSSProperties
  empty: CSSProperties
} = {
  group: {
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    padding: 'calc(16px * var(--sf))',
    display: 'flex',
    flexDirection: 'column',
    gap: 'calc(8px * var(--sf))',
  },
  caption: {
    fontFamily: 'var(--mono)',
    fontSize: 'calc(10px * var(--tf))',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink)',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    background: 'var(--paper)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: box,
    padding: box,
  },
  listbox: {
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
    borderRadius: box,
    boxShadow: '0 calc(4px * var(--sf)) calc(12px * var(--sf)) rgba(0, 0, 0, 0.12)',
    overflow: 'auto',
    maxHeight: 'calc(240px * var(--sf))',
  },
  option: (highlighted: boolean, selected: boolean): CSSProperties => ({
    padding: box,
    borderRadius: box,
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: highlighted ? 'var(--paper)' : 'var(--ink)',
    background: highlighted ? 'var(--ink)' : 'transparent',
    fontWeight: selected ? 600 : 400,
  }),
  empty: {
    padding: box,
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
  },
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  id,
  label,
}: ComboboxProps) {
  const autoId = useId()
  const inputId = id ?? `combobox-input-${autoId}`
  const listId = `combobox-list-${autoId}`
  const listName = label ?? 'Options'

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState(-1)

  const selected = useMemo(
    () => (value === null ? null : options.find((o) => o.value === value) ?? null),
    [options, value],
  )

  const visible = useMemo(() => {
    if (query === null || query === '') return options
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  function close() {
    setOpen(false)
    setQuery(null)
    setHighlighted(-1)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        if (!open) {
          setOpen(true)
          if (visible.length > 0) setHighlighted(0)
        } else if (visible.length > 0) {
          setHighlighted((h) => Math.max(0, Math.min(h + 1, visible.length - 1)))
        }
        break
      }
      case 'ArrowUp': {
        if (open && visible.length > 0) {
          event.preventDefault()
          setHighlighted((h) => (h <= 0 ? 0 : h - 1))
        }
        break
      }
      case 'Enter': {
        if (open) {
          const option = visible[highlighted]
          if (option) {
            event.preventDefault()
            onChange(option.value)
          }
        }
        break
      }
      case 'Escape': {
        if (open) {
          event.preventDefault()
          close()
        }
        break
      }
      case 'Tab': {
        if (open) close()
        break
      }
    }
  }

  const inputValue = query ?? selected?.label ?? ''

  return (
    <div style={styles.group}>
      <label htmlFor={inputId} style={styles.caption}>
        {label ?? 'Select'}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && visible.length > 0 ? `option-${highlighted}` : undefined}
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onMouseDown={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlighted(0)
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onBlur={close}
          style={styles.input}
        />
        {open && (
          <ul id={listId} role="listbox" aria-label={listName} style={styles.listbox}>
            {visible.length === 0 ? (
              <li style={styles.empty} aria-disabled="true">
                No results
              </li>
            ) : (
              visible.map((option, index) => (
                <li
                  key={option.value}
                  id={`option-${index}`}
                  role="option"
                  aria-label={option.name ?? option.label}
                  aria-selected={index === highlighted}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onChange(option.value)
                    close()
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  style={styles.option(index === highlighted, option.value === value)}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
