// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/time-input 0.1.0: snapshot of lacuna-components TimeInput at 5271c52 by sync-toolbox-components.py; a change gets a new version.
import { useId, useState, type CSSProperties } from 'react'
import { parseDuration } from '@lacuna/format-duration'

export interface TimeInputProps {
  mode: 'time' | 'duration'
  value: string
  onChange: (value: string) => void
  label?: string
  min?: string
  max?: string
  disabled?: boolean
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

function toMinutes(value: string): number {
  const match = TIME.exec(value)
  if (match === null) return -1
  return Number(match[1]) * 60 + Number(match[2])
}

function validateTime(value: string, min?: string, max?: string): string | null {
  if (!TIME.test(value)) return 'Invalid time'
  const minutes = toMinutes(value)
  if (min !== undefined && minutes <= toMinutes(min)) return `Time must be after ${min}`
  if (max !== undefined && minutes >= toMinutes(max)) return `Time must be before ${max}`
  return null
}

function validateDuration(value: string): string | null {
  if (value === '') return 'Invalid duration'
  try {
    return parseDuration(value) > 0 ? null : 'Invalid duration'
  } catch {
    return 'Invalid duration'
  }
}

const inputStyle: CSSProperties = {
  font: 'inherit',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  borderWidth: 'calc(1px * var(--sf))',
  borderStyle: 'solid',
  borderColor: 'var(--hair-strong)',
  padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
  minWidth: 'calc(96px * var(--sf))',
}

const errorStyle: CSSProperties = {
  display: 'block',
  marginTop: 'calc(4px * var(--sf))',
  fontFamily: 'var(--mono)',
  fontSize: 'calc(10px * var(--tf))',
  color: 'var(--danger)',
}

export function TimeInput({
  mode,
  value,
  onChange,
  label,
  min,
  max,
  disabled = false,
}: TimeInputProps) {
  const autoId = useId()
  const inputId = `time-input-${autoId}`
  const [draft, setDraft] = useState<string>(value)
  const [error, setError] = useState<string | null>(null)

  const shown = draft === '' ? value : draft

  function commit(liveValue: string): void {
    if (disabled) return
    const text = liveValue.trim()
    const problem = mode === 'time' ? validateTime(text, min, max) : validateDuration(text)
    if (problem !== null) {
      setError(problem)
      setDraft(value)
      return
    }
    if (text === '') {
      setDraft(value)
      return
    }
    setError(null)
    setDraft(text)
    if (text !== value) onChange(text)
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <label
        htmlFor={inputId}
        style={{
          marginBottom: 'calc(4px * var(--sf))',
          fontFamily: 'var(--mono)',
          fontSize: 'calc(10px * var(--tf))',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-60)',
        }}
      >
        {label ?? (mode === 'time' ? 'Time' : 'Duration')}
      </label>
      <input
        id={inputId}
        type="text"
        disabled={disabled}
        value={shown}
        placeholder={mode === 'time' ? 'HH:MM' : '1h 20m'}
        onChange={(event) => {
          setDraft(event.target.value)
          setError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(event.currentTarget.value)
          }
        }}
        style={{
          ...inputStyle,
          borderColor: error !== null ? 'var(--danger)' : inputStyle.borderColor,
          opacity: disabled ? 0.4 : 1,
        }}
      />
      {error !== null && (
        <span role="alert" aria-label={error} style={errorStyle}>
          {error}
        </span>
      )}
    </span>
  )
}
