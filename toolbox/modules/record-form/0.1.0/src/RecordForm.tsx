// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/record-form 0.1.0: snapshot of lacuna-components RecordForm at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { DatePicker } from '@lacuna/date-picker'
import { Combobox } from '@lacuna/combobox'
import { useForm, type FormValues } from '@lacuna/use-form'
import type { FieldSchema } from '@lacuna/schema-validate'
import type { FieldDef, RecordFormProps, RecordValues } from './index'

type RawValue = string | number | null

interface Entry {
  def: FieldDef
  schema: FieldSchema
  initial: string | number
}

const pad = (n: number): string => String(n).padStart(2, '0')

function toISO(value: string | number): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${m[1]}-${pad(mo)}-${pad(d)}`
}

function schemaType(def: FieldDef): 'text' | 'number' | 'date' | 'choice' {
  return def.type === 'select' ? 'choice' : def.type
}

function buildEntries(props: RecordFormProps): Entry[] {
  const out: Entry[] = []
  for (const def of props.fields) {
    const initialRaw = props.initialValues?.[def.name] ?? ''
    let initial: string | number
    if (def.type === 'number') {
      const n = typeof initialRaw === 'number' ? initialRaw : Number(initialRaw)
      initial = initialRaw === '' || initialRaw === null || Number.isNaN(n) ? '' : n
    } else if (def.type === 'date') {
      initial = toISO(initialRaw) ?? ''
    } else {
      initial = initialRaw === null ? '' : String(initialRaw)
    }
    const schema: FieldSchema = { name: def.name, label: def.label, type: schemaType(def) }
    if (def.required === true) schema.required = true
    if (def.type === 'number') {
      if (def.min !== undefined) schema.min = def.min
      if (def.max !== undefined) schema.max = def.max
    }
    if (def.type === 'select' && def.options !== undefined) schema.choices = def.options
    if (def.errorMessage !== undefined) {
      schema.messages = { required: def.errorMessage, min: def.errorMessage, max: def.errorMessage, type: def.errorMessage, choice: def.errorMessage }
    }
    out.push({ def, schema, initial })
  }
  return out
}

const fieldGap = 'calc(8px * var(--sf))'

const rowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: fieldGap,
}

const labelBase: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  fontWeight: 600,
  color: 'var(--ink)',
}

const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: fieldGap,
}

const invalidBorderStyle: CSSProperties = {
  border: 'calc(1px * var(--sf)) solid var(--danger)',
}

const errorStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink)',
}

const unitStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink)',
}

const buttonStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--paper)',
  background: 'var(--ink)',
  border: 'none',
  borderRadius: 'calc(4px * var(--sf))',
  padding: fieldGap,
  cursor: 'pointer',
}

const cancelButtonStyle: CSSProperties = {
  ...buttonStyle,
  color: 'var(--ink)',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
}

export function RecordForm(props: RecordFormProps): React.ReactElement {
  const propsRef = { current: props }
  propsRef.current = props
  const [entries, setEntries] = useState<Entry[]>(() => buildEntries(props))
  const fieldsKey = useMemo(
    () =>
      props.fields
        .map((f) => [f.name, f.label, f.type, f.required ?? false, f.min, f.max, f.unit, f.options?.join('\u0000'), f.errorMessage].join('\u0001'))
        .join('\u0002'),
    [props.fields],
  )
  useEffect(() => {
    setEntries(buildEntries(propsRef.current))
  }, [fieldsKey])

  const formFields = useMemo(
    () => entries.map((entry) => ({ schema: entry.schema, initialValue: entry.initial })),
    [entries],
  )

  const form = useForm({
    fields: formFields,
    onSubmit: (values: FormValues) => {
      const out: RecordValues = {}
      for (const entry of entries) {
        const v = values[entry.def.name]
        if (v !== null && v !== undefined) out[entry.def.name] = v
      }
      propsRef.current.onSubmit(out)
    },
  })

  const { values, errors, isDirty } = form.state
  const { setValue, submit: formSubmit } = form.actions

  function submit(): void {
    formSubmit()
  }

  const submitLabel = props.submitLabel ?? 'Save'
  const autoId = useId()

  const lastDirty = { current: false }
  useEffect(() => {
    if (lastDirty.current !== isDirty) {
      lastDirty.current = isDirty
      propsRef.current.onDirtyChange?.(isDirty)
    }
  }, [isDirty])

  useEffect(() => {
    const out: RecordValues = {}
    for (const entry of entries) {
      const v = values[entry.def.name]
      if (v !== null && v !== undefined && v !== '') out[entry.def.name] = v
    }
    propsRef.current.onValuesChange?.(out)
  }, [values, entries])

  function handleFormSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    submit()
  }

  function errorFor(entry: Entry): string | undefined {
    return errors[entry.def.name]
  }

  function renderField(entry: Entry): React.ReactElement {
    const { def } = entry
    const id = `rf-${autoId}-${def.name}`
    const invalid = errorFor(entry) !== undefined
    const requiredAttr = def.required === true ? true : undefined
    const control = (() => {
      switch (def.type) {
        case 'number': {
          const raw = values[def.name]
          const text = raw === null || raw === '' ? '' : String(raw)
          return (
            <input
              id={id}
              type="number"
              value={text}
              min={def.min}
              max={def.max}
              step="any"
              required={requiredAttr}
              aria-required={def.required === true ? 'true' : undefined}
              aria-invalid={invalid || undefined}
              onChange={(e) => {
                const v = e.target.value
                setValue(def.name, v === '' ? '' : Number(v))
              }}
              style={{ ...inputStyle, ...(invalid ? invalidBorderStyle : {}) }}
            />
          )
        }
        case 'date':
          return (
            <span style={{ display: 'inline-block' }}>
              <DatePicker
                value={typeof values[def.name] === 'string' && values[def.name] !== '' ? (values[def.name] as string) : null}
                onChange={(v) =>
                  setValue(
                    def.name,
                    v === null ? '' : Array.isArray(v) ? (v[0] ?? '') : v,
                  )
                }
                ariaLabel={def.label}
                showClear
              />
            </span>
          )
        case 'select': {
          const opts = def.options ?? []
          const storedVal = values[def.name]
          const stored = typeof storedVal === 'string' ? storedVal : ''
          return (
            <Combobox
              id={id}
              label={def.label}
              options={opts.map((o) => ({ value: o, label: o }))}
              value={stored === '' ? null : stored}
              placeholder="Select"
              onChange={(v) => setValue(def.name, v ?? '')}
            />
          )
        }
        default: {
          const textVal = values[def.name]
          return (
            <input
              id={id}
              type="text"
              value={typeof textVal === 'string' ? textVal : ''}
              required={requiredAttr}
              aria-required={def.required === true ? 'true' : undefined}
              aria-invalid={invalid || undefined}
              onChange={(e) => setValue(def.name, e.target.value)}
              style={{ ...inputStyle, ...(invalid ? invalidBorderStyle : {}) }}
            />
          )
        }
      }
    })()

    const error = errorFor(entry)
    const unit = def.type === 'number' && def.unit !== undefined ? (
      <span style={unitStyle}>Unit: {def.unit}</span>
    ) : null

    const label = def.type === 'select' ? null : (
      <label htmlFor={id} style={labelBase}>
        {def.label}
      </label>
    )

    return (
      <div key={def.name} style={rowStyle}>
        {label}
        {control}
        {unit}
        {error !== undefined && (
          <span role="alert" style={errorStyle}>
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <form
      noValidate
      aria-label={submitLabel}
      onSubmit={handleFormSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(16px * var(--sf))',
        fontFamily: 'var(--sans)',
        color: 'var(--ink)',
      }}
    >
      {entries.map(renderField)}
      <div style={{ display: 'flex', gap: fieldGap }}>
        <button type="submit" style={buttonStyle}>
          {submitLabel}
        </button>
        {props.cancelLabel !== undefined && (
          <button type="button" style={cancelButtonStyle} onClick={() => propsRef.current.onCancel?.()}>
            {props.cancelLabel}
          </button>
        )}
      </div>
    </form>
  )
}
