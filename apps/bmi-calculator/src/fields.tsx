import { CSSProperties, ReactNode } from 'react'

export type FieldError = string | null

export function MeasureField({
  label,
  value,
  onChange,
  hint,
  error,
  inputMode = 'decimal',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint: string
  error?: FieldError
  inputMode?: 'decimal' | 'numeric'
}) {
  const invalid = error ? true : undefined
  const style: CSSProperties = { display: 'block' }
  const labelStyle: CSSProperties = {
    fontSize: 'calc(12px * var(--tf))',
    fontWeight: 600,
    letterSpacing: 'calc(0.3px * var(--sf))',
    color: 'var(--ink)',
  }
  const inputStyle: CSSProperties = {
    marginTop: 'calc(4px * var(--sf))',
    width: '100%',
    boxSizing: 'border-box',
    padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
    borderRadius: 'calc(6px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid var(--ui-line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontSize: 'calc(14px * var(--tf))',
    outline: 'none',
  }
  const hintStyle: CSSProperties = {
    marginTop: 'calc(4px * var(--sf))',
    fontSize: 'calc(11px * var(--tf))',
    color: 'var(--ink-60)',
  }
  const errorStyle: CSSProperties = {
    marginTop: 'calc(4px * var(--sf))',
    fontSize: 'calc(11px * var(--tf))',
    color: 'var(--danger)',
  }
  return (
    <label style={style}>
      <span style={labelStyle}>{label}</span>
      <input
        style={inputStyle}
        inputMode={inputMode}
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span style={errorStyle} role="alert">
          {error}
        </span>
      ) : (
        <span style={hintStyle}>{hint}</span>
      )}
    </label>
  )
}

export function MeasureSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const style: CSSProperties = { display: 'block' }
  const labelStyle: CSSProperties = {
    fontSize: 'calc(12px * var(--tf))',
    fontWeight: 600,
    letterSpacing: 'calc(0.3px * var(--sf))',
    color: 'var(--ink)',
  }
  const selectStyle: CSSProperties = {
    marginTop: 'calc(4px * var(--sf))',
    width: '100%',
    boxSizing: 'border-box',
    padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
    borderRadius: 'calc(6px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid var(--ui-line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontSize: 'calc(14px * var(--tf))',
    outline: 'none',
  }
  return (
    <label style={style}>
      <span style={labelStyle}>{label}</span>
      <select style={selectStyle} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
