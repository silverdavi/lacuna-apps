// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/search-box 0.1.0: snapshot of lacuna-components SearchBox at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { fuzzySearch } from '@lacuna/fuzzy-search'
import type { FuzzyMatch } from '@lacuna/fuzzy-search'

export interface SearchBoxField {
  key: string
  weight?: number
}

export interface SearchBoxProps<T extends Record<string, unknown>> {
  records: T[]
  fields: SearchBoxField[]
  placeholder?: string
  maxResults?: number
  onSelect?: (record: T) => void
  onQueryChange?: (query: string) => void
  renderResult?: (
    record: T,
    highlights: Array<{ field: string; start: number; end: number }>,
  ) => ReactNode
  emptyMessage?: string
  ariaLabel?: string
}

const padSm = 'calc(4px * var(--sf))'

const styles: {
  root: CSSProperties
  input: CSSProperties
  listbox: CSSProperties
  option: (active: boolean) => CSSProperties
  empty: CSSProperties
  highlight: CSSProperties
} = {
  root: {
    position: 'relative',
    width: '100%',
    fontFamily: 'var(--sans)',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    background: 'var(--paper)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: padSm,
    padding: padSm,
  },
  listbox: {
    position: 'absolute',
    top: 'calc(100% + calc(2px * var(--sf)))',
    left: 0,
    right: 0,
    zIndex: 10,
    margin: 0,
    padding: padSm,
    listStyle: 'none',
    background: 'var(--paper-deep)',
    color: 'var(--ink)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: padSm,
    overflow: 'auto',
    maxHeight: 'calc(240px * var(--sf))',
  },
  option: (active: boolean): CSSProperties => ({
    padding: padSm,
    borderRadius: padSm,
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: active ? 'var(--paper)' : 'var(--ink)',
    background: active ? 'var(--ink)' : 'transparent',
  }),
  empty: {
    padding: padSm,
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
  },
  highlight: {
    fontWeight: 700,
  },
}

export function SearchBox<T extends Record<string, unknown>>({
  records,
  fields,
  placeholder,
  maxResults = 10,
  onSelect,
  onQueryChange,
  renderResult,
  emptyMessage = 'No results',
  ariaLabel,
}: SearchBoxProps<T>) {
  const [query, setQuery] = useState('')
  const matches: FuzzyMatch[] = useMemo(() => {
    if (query === '') {
      return records.slice(0, maxResults).map((record, index) => ({
        index,
        score: 0,
        highlights: [],
      }))
    }
    return fuzzySearch(records, query, {
      fields: fields.map((f) => f.key),
      maxResults,
    })
  }, [records, query, fields, maxResults])

  const focusedIndexRef = useRef(-1)
  const rootRef = useRef<HTMLDivElement | null>(null)

  function activeIndex(): number {
    if (rootRef.current) {
      const el = rootRef.current.querySelector<HTMLElement>(':focus')
      const attr = el?.getAttribute('data-searchbox-option')
      if (attr !== null) return Number(attr)
    }
    return focusedIndexRef.current
  }

  function setFocus(index: number) {
    if (index < 0) {
      rootRef.current?.querySelector<HTMLInputElement>('input[role="searchbox"]')?.focus()
      focusedIndexRef.current = -1
      return
    }
    const target = rootRef.current?.querySelector<HTMLElement>(`[data-searchbox-option="${index}"]`)
    target?.focus()
    focusedIndexRef.current = index
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    const key = event.key
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter' && key !== 'Escape') return
    event.preventDefault()
    const current = activeIndex()
    switch (key) {
      case 'ArrowDown': {
        if (matches.length === 0) break
        setFocus(Math.min(current + 1, matches.length - 1))
        break
      }
      case 'ArrowUp': {
        setFocus(-1)
        break
      }
      case 'Enter': {
        if (current < 0) break
        const match = matches[current]
        const record = match === undefined ? undefined : records[match.index]
        if (record !== undefined) onSelect?.(record)
        break
      }
      case 'Escape': {
        setQuery('')
        onQueryChange?.('')
        setFocus(-1)
        break
      }
    }
  }

  function renderDefault(record: T, highlights: Array<{ field: string; start: number; end: number }>): ReactNode {
    const firstField = fields[0]?.key
    if (firstField === undefined) return String(record.id ?? '')
    const value = record[firstField]
    if (typeof value !== 'string') return String(record.id ?? '')
    const forField = highlights
      .filter((h) => h.field === firstField)
      .sort((a, b) => a.start - b.start)
    if (forField.length === 0) return value
    const parts: ReactNode[] = []
    let cursor = 0
    for (let i = 0; i < forField.length; i++) {
      const run = forField[i]
      if (run === undefined) continue
      if (run.start > cursor) parts.push(value.slice(cursor, run.start))
      parts.push(
        <span key={i} style={styles.highlight}>
          {value.slice(run.start, run.end)}
        </span>,
      )
      cursor = run.end
    }
    if (cursor < value.length) parts.push(value.slice(cursor))
    return parts
  }

  const label = ariaLabel ?? placeholder
  return (
    <div data-searchbox-root ref={rootRef} onKeyDown={handleKeyDown} style={styles.root}>
      <input
        type="search"
        role="searchbox"
        aria-label={label}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          onQueryChange?.(event.target.value)
          focusedIndexRef.current = -1
        }}
        style={styles.input}
      />
      <ul role="listbox" aria-label={label ? `${label} results` : 'Results'} style={styles.listbox}>
        {matches.length === 0 ? (
          <li style={styles.empty}>{emptyMessage}</li>
        ) : (
          matches.map((match, index) => {
            const record = records[match.index]
            if (record === undefined) return null
            const content = renderResult
              ? renderResult(record, match.highlights)
              : renderDefault(record, match.highlights)
            return (
              <li
                key={match.index}
                data-searchbox-option={index}
                role="option"
                aria-selected={false}
                tabIndex={-1}
                onFocus={() => {
                  focusedIndexRef.current = index
                }}
                onClick={() => onSelect?.(record)}
                style={styles.option(false)}
              >
                {content}
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
