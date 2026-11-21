// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/money-input 0.1.0: snapshot of lacuna-components MoneyInput at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { format } from '@lacuna/money'

export interface MoneyInputProps {
  value: number
  onChange: (minorUnits: number) => void
  currency: string
  locale?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  'aria-label'?: string
}

function roundHalfUp(x: number): number {
  const sign = x < 0 ? -1 : 1
  return sign * (Math.floor(Math.abs(x) + 0.5))
}

function parseToMinorUnits(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return null
  const cleaned = trimmed.replace(/[^\d.,-]/g, '')
  if (!/\d/.test(cleaned)) return null
  const negative = cleaned.startsWith('-')
  const digits = cleaned.replace(/-/g, '')
  const normalized = digits.replace(/,/g, '')
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return null
  const value = negative ? -parsed : parsed
  return roundHalfUp(value * 100)
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  let result = value
  if (min !== undefined && result < min) result = min
  if (max !== undefined && result > max) result = max
  return result
}

export function MoneyInput({
  value,
  onChange,
  currency,
  locale = 'en-US',
  min,
  max,
  step = 1,
  placeholder,
  disabled = false,
  'aria-label': ariaLabel = 'Amount',
}: MoneyInputProps) {
  const autoId = useId()
  const inputId = `money-input-${autoId}`
  const inputRef = useRef<HTMLInputElement | null>(null)
  const escapeRef = useRef(false)
  const [draft, setDraft] = useState<string>(() => format(value, { currency, locale }))

  useEffect(() => {
    if (inputRef.current === document.activeElement) return
    setDraft(format(value, { currency, locale }))
  }, [value, currency, locale])

  function commit(text: string): void {
    if (escapeRef.current) return
    const parsed = parseToMinorUnits(text)
    if (parsed === null) {
      setDraft(format(value, { currency, locale }))
      return
    }
    const clamped = clamp(parsed, min, max)
    setDraft(format(clamped, { currency, locale }))
    if (clamped !== value) onChange(clamped)
  }

  function nudge(direction: 1 | -1): void {
    const next = clamp(value + direction * step, min, max)
    if (next === value) return
    setDraft(format(next, { currency, locale }))
    onChange(next)
  }

  const buttonStyle: CSSProperties = {
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
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        disabled={disabled}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            escapeRef.current = true
            setDraft(format(value, { currency, locale }))
            inputRef.current?.blur()
            setTimeout(() => {
              escapeRef.current = false
            }, 0)
          } else if (event.key === 'ArrowUp') {
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
        aria-label="Decrease value"
        disabled={disabled}
        onClick={() => nudge(-1)}
        style={buttonStyle}
      >
        -
      </button>
      <button
        type="button"
        aria-label="Increase value"
        disabled={disabled}
        onClick={() => nudge(1)}
        style={buttonStyle}
      >
        +
      </button>
    </span>
  )
}
