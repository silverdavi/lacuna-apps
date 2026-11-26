// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/number-input 0.1.0: snapshot of lacuna-components NumberInput at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'

export interface NumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  locale?: string
  disabled?: boolean
  id?: string
  label?: string
}

function formatValue(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }).format(value)
}

function parseValue(text: string, locale: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const cleaned = trimmed.replace(/[^\d.,-]/g, '')
  if (!/\d/.test(cleaned)) return null
  const negative = cleaned.startsWith('-')
  const digits = cleaned.replace(/-/g, '')
  try {
    const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(1234.56789)
    const decimalSep = parts.find((part) => part.type === 'decimal')?.value
    const groupSep = parts.find((part) => part.type === 'group')?.value
    if (!decimalSep) return null
    const normalized = digits
      .split(decimalSep)
      .map((segment) => (groupSep ? segment.split(groupSep).join('') : segment))
      .join('.')
    const parsed = Number(normalized)
    if (Number.isNaN(parsed)) return null
    return negative ? -parsed : parsed
  } catch {
    return null
  }
}

function clampValue(value: number, min: number | undefined, max: number | undefined): number {
  let result = value
  if (min !== undefined && result < min) result = min
  if (max !== undefined && result > max) result = max
  return result
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  locale = 'en-US',
  disabled = false,
  id,
  label,
}: NumberInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<string>(() => (value === null ? '' : formatValue(value, locale)))

  useEffect(() => {
    if (inputRef.current === document.activeElement) return
    setDraft(value === null ? '' : formatValue(value, locale))
  }, [value, locale])

  function commit(text: string): void {
    const parsed = parseValue(text, locale)
    if (parsed === null) {
      setDraft('')
      if (value !== null) onChange(null)
      return
    }
    const clamped = clampValue(parsed, min, max)
    setDraft(formatValue(clamped, locale))
    if (clamped !== value) onChange(clamped)
  }

  function nudge(direction: 1 | -1): void {
    const next = clampValue((value ?? 0) + direction * step, min, max)
    if (next === value) return
    setDraft(formatValue(next, locale))
    onChange(next)
  }

  const stepperButtonStyle: CSSProperties = {
    font: 'inherit',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    background: 'var(--paper-deep)',
    borderWidth: 'calc(1px * var(--sf))',
    borderStyle: 'solid',
    borderColor: 'var(--hair-strong)',
    padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
    cursor: 'pointer',
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'calc(8px * var(--sf))',
        fontFamily: 'var(--sans)',
      }}
    >
      {label !== undefined && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'calc(14px * var(--tf))',
            color: 'var(--ink)',
            margin: '0 0 0 calc(8px * var(--sf))',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        disabled={disabled}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            nudge(1)
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            nudge(-1)
          }
        }}
        style={{
          font: 'inherit',
          fontSize: 'calc(14px * var(--tf))',
          color: 'var(--ink)',
          background: 'var(--paper)',
          borderWidth: 'calc(1px * var(--sf))',
          borderStyle: 'solid',
          borderColor: 'var(--hair-strong)',
          padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
          minWidth: 'calc(80px * var(--sf))',
        }}
      />
      <button
        type="button"
        aria-label={`Decrease ${label ?? 'value'}`}
        disabled={disabled}
        onClick={() => nudge(-1)}
        style={stepperButtonStyle}
      >
        −
      </button>
      <button
        type="button"
        aria-label={`Increase ${label ?? 'value'}`}
        disabled={disabled}
        onClick={() => nudge(1)}
        style={stepperButtonStyle}
      >
        +
      </button>
      {unit !== undefined && unit !== '' && (
        <span
          style={{
            fontSize: 'calc(14px * var(--tf))',
            color: 'var(--ink)',
            padding: '0 calc(8px * var(--sf))',
          }}
        >
          {unit}
        </span>
      )}
    </span>
  )
}
