// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/tag-input 0.1.0: snapshot of lacuna-components TagInput at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent as ReactFormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  maxTags?: number
  disabled?: boolean
  'aria-label'?: string
}

const unit = (n: number, scale: 'tf' | 'sf') => `calc(${n}px * var(--${scale}))`

const styles: {
  wrapper: CSSProperties
  container: (focused: boolean, disabled: boolean) => CSSProperties
  chip: CSSProperties
  chipText: CSSProperties
  removeButton: CSSProperties
  input: (disabled: boolean) => CSSProperties
  listbox: CSSProperties
  option: (highlighted: boolean) => CSSProperties
} = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
    width: '100%',
    fontFamily: 'var(--sans)',
  },
  container: (focused, disabled) => ({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: unit(4, 'sf'),
    padding: unit(4, 'sf'),
    boxSizing: 'border-box',
    background: 'var(--paper)',
    color: 'var(--ink)',
    border: `calc(1px * var(--sf)) solid ${focused ? 'var(--accent)' : 'var(--hair-strong)'}`,
    borderRadius: unit(6, 'sf'),
  }),
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: unit(4, 'sf'),
    padding: `calc(2px * var(--sf)) ${unit(6, 'sf')}`,
    background: 'var(--paper-deep)',
    color: 'var(--ink)',
    borderRadius: unit(4, 'sf'),
  },
  chipText: {
    fontSize: unit(14, 'tf'),
  },
  removeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
    border: `calc(1px * var(--sf)) solid transparent`,
    borderRadius: unit(3, 'sf'),
    background: 'transparent',
    color: 'var(--ink)',
    cursor: 'pointer',
    fontSize: unit(14, 'tf'),
    lineHeight: 1,
    paddingInline: unit(2, 'sf'),
  },
  input: (disabled) => ({
    flex: 1,
    minWidth: unit(80, 'sf'),
    fontFamily: 'var(--sans)',
    fontSize: unit(14, 'tf'),
    color: 'var(--ink)',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: unit(4, 'sf'),
  }),
  listbox: {
    position: 'absolute',
    top: `calc(100% + ${unit(4, 'sf')})`,
    left: 0,
    right: 0,
    zIndex: 10,
    margin: 0,
    padding: unit(4, 'sf'),
    listStyle: 'none',
    background: 'var(--paper-deep)',
    color: 'var(--ink)',
    border: `calc(1px * var(--sf)) solid var(--hair-strong)`,
    borderRadius: unit(6, 'sf'),
    overflow: 'auto',
    maxHeight: unit(200, 'sf'),
  },
  option: (highlighted) => ({
    padding: unit(6, 'sf'),
    borderRadius: unit(4, 'sf'),
    cursor: 'pointer',
    fontSize: unit(14, 'tf'),
    color: highlighted ? 'var(--paper)' : 'var(--ink)',
    background: highlighted ? 'var(--ink)' : 'transparent',
  }),
}

function matchesPrefix(tag: string, prefix: string): boolean {
  if (prefix === '') return true
  return tag.toLowerCase().startsWith(prefix.toLowerCase())
}

export function TagInput({
  tags,
  onChange,
  suggestions,
  placeholder,
  maxTags,
  disabled = false,
  'aria-label': ariaLabel,
}: TagInputProps): React.JSX.Element {
  const autoId = useId()
  const inputId = `taginput-input-${autoId}`
  const listId = `taginput-list-${autoId}`

  const [draft, setDraft] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const [focused, setFocused] = useState(false)
  const [escaped, setEscaped] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const label = ariaLabel ?? 'Add tag'
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0

  const filtered = useMemo(() => {
    if (!hasSuggestions || disabled) return []
    const prefix = draft.trim()
    return suggestions.filter((s) => matchesPrefix(s, prefix))
  }, [hasSuggestions, disabled, draft, suggestions])

  const listOpen = hasSuggestions && !disabled && focusOpen && !escaped && filtered.length > 0

  const isFull = typeof maxTags === 'number' && tags.length >= maxTags
  const canAdd = !disabled && !isFull

  function closeList() {
    setHighlighted(-1)
  }

  function commit(value: string) {
    const v = value.trim()
    if (v === '' || tags.includes(v) || isFull) {
      setDraft('')
      closeList()
      return
    }
    onChange([...tags, v])
    setDraft('')
    closeList()
    inputRef.current?.focus()
  }

  function syncFromEvent(e: ReactFormEvent<HTMLInputElement>) {
    const val = e.currentTarget.value
    if (val !== draft) {
      setDraft(val)
      setEscaped(false)
      setHighlighted(
        suggestions !== undefined &&
          !disabled &&
          suggestions.some((s) => matchesPrefix(s, val.trim()))
          ? 0
          : -1,
      )
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
    inputRef.current?.focus()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (listOpen && highlighted >= 0) {
        const option = filtered[highlighted]
        if (option !== undefined) {
          commit(option)
          return
        }
      }
      commit(draft)
      return
    }
    if (event.key === 'Backspace' && draft === '') {
      if (tags.length > 0) {
        onChange(tags.slice(0, -1))
      }
      return
    }
    if (event.key === 'Escape' && listOpen) {
      setEscaped(true)
      closeList()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (listOpen) {
        setHighlighted((h) => (h + 1) % filtered.length)
      }
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (listOpen) {
        setHighlighted((h) => (h <= 0 ? filtered.length - 1 : h - 1))
      }
    }
  }

  return (
    <div style={styles.wrapper}>
      <div
        style={styles.container(focused, disabled)}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} style={styles.chip}>
            <span style={styles.chipText}>{tag}</span>
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              tabIndex={disabled ? -1 : 0}
              disabled={disabled}
              onClick={() => removeTag(tag)}
              style={styles.removeButton}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          aria-label={label}
          placeholder={placeholder ?? 'Add tag'}
          value={draft}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value)
            setEscaped(false)
            setHighlighted(filtered.length > 0 ? 0 : -1)
          }}
          onInput={syncFromEvent}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            setFocusOpen(true)
          }}
          onBlur={() => {
            setFocused(false)
            setFocusOpen(false)
            closeList()
          }}
          style={styles.input(!canAdd)}
        />
      </div>
      {listOpen && (
        <ul id={listId} role="listbox" aria-label="Suggestions" style={styles.listbox}>
          {filtered.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`${listId}-opt-${index}`}
              role="option"
              aria-selected={index === highlighted}
              onClick={() => commit(suggestion)}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlighted(index)}
              style={styles.option(index === highlighted)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
