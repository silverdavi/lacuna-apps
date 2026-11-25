// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/question-card 0.1.0: snapshot of lacuna-components QuestionCard at 27329c5 by sync-toolbox-components.py; a change gets a new version.
import { useId, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

export interface QuestionCardProps {
  prompt: string
  type: 'choice' | 'text' | 'number'
  options?: string[]
  correctAnswer?: string
  correctValue?: number
  tolerance?: number
  caseSensitive?: boolean
  onNext: (correct: boolean) => void
  disabled?: boolean
  resultLine?: string
}

const CARD: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(12px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(2px * var(--sf))',
  padding: 'calc(16px * var(--sf))',
}

const HEADING: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--serif)',
  fontWeight: 500,
  fontSize: 'calc(18px * var(--tf))',
  color: 'var(--ink)',
}

const CHOICE_LIST: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
}

const FIELD: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const INPUT: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(2px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

const OPTION: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(2px * var(--sf))',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
  textAlign: 'left',
  cursor: 'pointer',
}

const ACTION: CSSProperties = {
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(2px * var(--sf))',
  background: 'var(--ink)',
  color: 'var(--paper)',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
  cursor: 'pointer',
  alignSelf: 'flex-start',
}

const FEEDBACK: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
}

const RESULT: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--mono)',
  fontSize: 'calc(11px * var(--tf))',
  color: 'var(--ink)',
}

export function QuestionCard({
  prompt,
  type,
  options,
  correctAnswer,
  correctValue,
  tolerance,
  caseSensitive,
  onNext,
  disabled,
  resultLine,
}: QuestionCardProps) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const headingId = useId()

  const isDisabled = disabled === true
  const answered = feedback !== null

  const matches = (candidate: string, expected: string): boolean =>
    caseSensitive === true
      ? candidate === expected
      : candidate.toLowerCase() === expected.toLowerCase()

  const grade = (candidate: string): boolean => {
    if (type === 'number' && correctValue !== undefined) {
      const parsed = Number(candidate)
      if (Number.isNaN(parsed)) return false
      return Math.abs(parsed - correctValue) <= (tolerance ?? 0)
    }
    return correctAnswer !== undefined && matches(candidate, correctAnswer)
  }

  const submit = (): void => {
    if (isDisabled) return
    setFeedback(grade(value.trim()))
  }

  const choose = (option: string): void => {
    if (isDisabled) return
    setFeedback(grade(option))
  }

  const advance = (): void => {
    onNext(feedback === true)
    setFeedback(null)
    setValue('')
  }

  const onEnter = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  const choices =
    type === 'choice' && options !== undefined ? (
      <div style={CHOICE_LIST}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={isDisabled}
            onClick={() => choose(option)}
            style={OPTION}
          >
            {option}
          </button>
        ))}
      </div>
    ) : null

  const input =
    type === 'text' || type === 'number' ? (
      <div style={FIELD}>
        <input
          aria-label="Answer"
          value={value}
          disabled={isDisabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onEnter}
          style={INPUT}
        />
      </div>
    ) : null

  return (
    <section aria-labelledby={headingId} style={CARD}>
      <h2 id={headingId} style={HEADING}>
        {prompt}
      </h2>
      {choices}
      {input}
      {type !== 'choice' && !isDisabled && (
        <button type="button" onClick={submit} style={ACTION}>
          Submit answer
        </button>
      )}
      {answered && !isDisabled && (
        <p role="status" style={FEEDBACK}>
          {feedback ? 'Correct' : 'Incorrect'}
        </p>
      )}
      {!isDisabled && (
        <button type="button" disabled={!answered} onClick={advance} style={ACTION}>
          Next question
        </button>
      )}
      {resultLine !== undefined && <p style={RESULT}>{resultLine}</p>}
    </section>
  )
}
