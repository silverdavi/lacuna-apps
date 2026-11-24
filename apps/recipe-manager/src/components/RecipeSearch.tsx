import { useEffect, useRef, type CSSProperties } from 'react'

export interface RecipeSearchProps {
  value: string
  onChange: (next: string) => void
  resultCount: number
  totalCount: number
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: `calc(1px * var(--sf)) solid var(--hair-strong)`,
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf))',
  minHeight: 'calc(32px * var(--sf))',
}

const boxStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(6px * var(--sf))',
}

const metaStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink-60)',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function RecipeSearch({ value, onChange, resultCount, totalCount }: RecipeSearchProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const q = value.trim()
  const matches = resultCount

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value === '') {
      el.innerHTML = ''
    } else {
      el.innerHTML = `<mark>${escapeHtml(value)}</mark>`
    }
  }, [value])

  let meta: React.ReactNode
  if (!q) {
    meta = `Search ${totalCount} recipes`
  } else if (matches === 0) {
    meta = 'No recipes match'
  } else {
    meta = `${matches} of ${totalCount} recipes match`
  }

  return (
    <div style={boxStyle}>
      <div
        ref={ref}
        role="searchbox"
        aria-label="Search"
        aria-autocomplete="list"
        aria-readonly={false}
        tabIndex={0}
        contentEditable
        onInput={(e) => {
          const text = e.currentTarget.textContent ?? ''
          onChange(text)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('')
        }}
        style={inputStyle}
        suppressContentEditableWarning
      />
      <div style={metaStyle}>{meta}</div>
    </div>
  )
}
