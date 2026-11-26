// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/flip-card 0.1.0: snapshot of lacuna-components FlipCard at f879fb0 by sync-toolbox-components.py; a change gets a new version.
import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { FlipCardProps } from './index'

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
}

const cardStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(8px * var(--sf))',
  padding: 'calc(16px * var(--sf))',
  minHeight: 'calc(96px * var(--sf))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontSize: 'calc(16px * var(--tf))',
  cursor: 'pointer',
  userSelect: 'none',
}

const disabledStyle: CSSProperties = {
  cursor: 'not-allowed',
}

const gradeRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 'calc(6px * var(--sf))',
}

const gradeBtnStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(14px * var(--tf))',
  padding: 'calc(4px * var(--sf)) calc(10px * var(--sf))',
  borderRadius: 'calc(6px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  cursor: 'pointer',
}

export function FlipCard({ front, back, onGrade, disabled = false }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const toggle = () => {
    if (!disabled) setFlipped((f) => !f)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }

  const label = flipped ? `${front}: ${back}` : front

  return (
    <div style={wrapStyle}>
      <div
        role="button"
        aria-pressed={flipped}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
        onClick={toggle}
        onKeyDown={onKeyDown}
        style={{ ...cardStyle, ...(disabled ? disabledStyle : undefined) }}
      >
        {flipped ? back : front}
      </div>
      {flipped && !disabled && onGrade && (
        <div role="group" aria-label="Grade" style={gradeRowStyle}>
          {[0, 1, 2, 3, 4, 5].map((grade) => (
            <button
              key={grade}
              type="button"
              aria-label={`Grade ${grade}`}
              onClick={() => onGrade(grade)}
              style={gradeBtnStyle}
            >
              {grade}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
