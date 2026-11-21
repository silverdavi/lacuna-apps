// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// @lacuna/ui: everything an app's screen is made of.
// Every app renders one <AppShell> (the page frame, from ./kit) and builds inside it with Card, FormGrid,
// TextInput, Select, Button, Actions, Kpi, Table, List/Row, Tag, Chip, EmptyState and ErrorState.
// Platform behavior (primary action, 24px hit target, focus ring, empty state) is behavior.tsx.
// KIT.md next to this file lists the props, the tokens, and one complete example.
import type { CSSProperties, ReactNode } from 'react'
import { HoverLabel } from './hover'
import './base.css'

export { Mark } from './mark'
export { BrandHome, Breadcrumbs, BackControl } from './chrome'
export type { Crumb, NavLink } from './chrome'
export { ResizablePanel } from './layout'
export { ICONS, SUITE_ICONS, iconForFlow } from './icons'
export type { IconName, IconProps } from './icons'
export { AppShell, Board, Checkbox, ErrorState, HUES, Keys, List, Plate, Rail, Row, SectionLabel, Select } from './kit'
export type { Hue } from './kit'
export { Adopt } from './adopt'
export { EmptyState, FOCUS_RING, HIT_MIN_PX, PrimaryButton } from './behavior'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Title({ children, size = 'lg', as: As = 'div', style }: { children: ReactNode; size?: 'xl' | 'lg' | 'md'; as?: 'div' | 'h2' | 'h3'; style?: CSSProperties }) {
  return <As className={`lc-title lc-title-${size}`} style={{ margin: 0, ...style }}>{children}</As>
}

export function MonoLabel({ children, accent, faint, sm, style }: { children: ReactNode; accent?: boolean; faint?: boolean; sm?: boolean; style?: CSSProperties }) {
  return <div className={cx('lc-mono', sm && 'lc-mono-sm', accent && 'lc-accent', faint && 'lc-faint')} style={style}>{children}</div>
}

export function Body({ children, sm, style }: { children: ReactNode; sm?: boolean; style?: CSSProperties }) {
  return <div className={sm ? 'lc-body-sm' : 'lc-body'} style={style}>{children}</div>
}

const AVATAR_TONES = { ink: 'var(--ink)', mid: 'var(--mid)', accent: 'var(--accent)' } as const

export function Avatar({ initials, size = 26, tone = 'mid' }: { initials: string; size?: number; tone?: keyof typeof AVATAR_TONES }) {
  return (
    <span className="lc-avatar" style={{ width: size, height: size, background: AVATAR_TONES[tone], fontSize: size * 0.4 }}>
      {initials}
    </span>
  )
}

export function Card({ title, mono, actions, children, flush, accent, style, className }: {
  title?: ReactNode
  mono?: ReactNode
  actions?: ReactNode
  children: ReactNode
  flush?: boolean
  accent?: boolean
  style?: CSSProperties
  className?: string
}) {
  return (
    <section className={cx('lc-card', flush && 'flush', accent && 'accent', className)} style={style}>
      {(title || mono || actions) && (
        <div className="lc-card-head">
          <div>
            {mono && <MonoLabel sm>{mono}</MonoLabel>}
            {title && <Title size="md">{title}</Title>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="lc-chip">{children}</span>
}

export function Tag({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <span className={cx('lc-tag', accent && 'accent')}>{children}</span>
}

export function Button({ children, kind = 'secondary', onClick, style, disabled, type = 'button', ariaLabel, title }: {
  children: ReactNode
  kind?: 'primary' | 'secondary' | 'ghost' | 'ink' | 'danger'
  onClick?: () => void
  style?: CSSProperties
  disabled?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string
  title?: string
}) {
  return <button type={type} className={`lc-btn ${kind}`} onClick={onClick} style={style} disabled={disabled} aria-label={ariaLabel} title={title}>{children}</button>
}

export function Kpi({ value, label, accent }: { value: ReactNode; label: ReactNode; accent?: boolean }) {
  return (
    <div>
      <div className={cx('lc-kpi-value', accent && 'accent')}>{value}</div>
      <div className="lc-kpi-label">{label}</div>
    </div>
  )
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="lc-kpirow">{children}</div>
}

export function Table({ columns, rows, foot, empty, label }: {
  columns: { key: string; label: ReactNode; num?: boolean }[]
  rows: { cells: Record<string, ReactNode>; hot?: boolean }[]
  /** Totals row. */
  foot?: Record<string, ReactNode>
  /** Shown in place of the rows when there are none, e.g. "No deductions". */
  empty?: ReactNode
  /** Accessible name of the table. */
  label?: string
}) {
  const dataLabel = (c: { label: ReactNode }) => (typeof c.label === 'string' ? c.label : undefined)
  return (
    <table className="lc-table" aria-label={label}>
      <thead>
        <tr>{columns.map((c) => <th key={c.key} className={c.num ? 'num' : undefined}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.hot ? 'hot' : undefined}>
            {columns.map((c) => (
              <td key={c.key} className={c.num ? 'num' : undefined} data-label={dataLabel(c)}>{r.cells[c.key]}</td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && empty != null && (
          <tr><td colSpan={columns.length} className="lc-faint" style={{ color: 'var(--ink-60)' }}>{empty}</td></tr>
        )}
      </tbody>
      {foot && (
        <tfoot>
          <tr>
            {columns.map((c) => (
              <td key={c.key} className={c.num ? 'num' : undefined} data-label={dataLabel(c)}>{foot[c.key]}</td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  )
}

export function Field({ label, value, prefill, placeholder }: {
  label: ReactNode
  value?: string
  prefill?: string
  placeholder?: string
}) {
  return (
    <div className="lc-field">
      <div className="lc-field-label">{typeof label === 'string' ? <HoverLabel text={label} /> : label}</div>
      <input className={cx('lc-input', value && 'filled')} defaultValue={value} placeholder={placeholder} readOnly={Boolean(value)} title={value} />
      {prefill && <div className="lc-prefill">{prefill}</div>}
    </div>
  )
}

export function TextInput({ label, value, onChange, rows, type, inputMode, placeholder, error, hint }: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  type?: 'text' | 'number' | 'date' | 'time' | 'email' | 'search' | 'password'
  inputMode?: 'text' | 'numeric' | 'decimal'
  placeholder?: string
  /** Validation message for this field. Shown under the input and announced. */
  error?: string | null
  /** Short help under the input. */
  hint?: string
}) {
  const invalid = error ? true : undefined
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      {rows ? (
        <textarea className="lc-input" rows={rows} value={value} placeholder={placeholder} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="lc-input" type={type} inputMode={inputMode} value={value} placeholder={placeholder} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
      )}
      {error ? <span className="lk-field-error" role="alert">{error}</span> : hint ? <span className="lk-field-hint">{hint}</span> : null}
    </label>
  )
}

/** Responsive grid of fields: put TextInput and Select inside. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="lk-form">{children}</div>
}

/** A row of buttons. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="lk-actions">{children}</div>
}

export function Tabs({ items, active, onSelect }: { items: string[]; active: string; onSelect?: (value: string) => void }) {
  return (
    <div className="lc-tabs">
      {items.map((item) => (
        <button type="button" key={item} className={cx('lc-tab', item === active && 'active')} onClick={() => onSelect?.(item)}>{item}</button>
      ))}
    </div>
  )
}

export function Pills({ items, active, onSelect }: { items: string[]; active: string; onSelect?: (value: string) => void }) {
  return (
    <div className="lc-pills">
      {items.map((item) => (
        <button type="button" key={item} className={cx('lc-pill', item === active && 'active')} onClick={() => onSelect?.(item)}>{item}</button>
      ))}
    </div>
  )
}

export function Cols({ kind, children, style }: { kind: '2' | '3' | 'main-side' | 'side-main'; children: ReactNode; style?: CSSProperties }) {
  return <div className={`lc-cols lc-cols-${kind}`} style={style}>{children}</div>
}

export function Stack({ children, lg, style }: { children: ReactNode; lg?: boolean; style?: CSSProperties }) {
  return <div className={lg ? 'lc-stack-lg' : 'lc-stack'} style={style}>{children}</div>
}

export function Spread({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="lc-spread" style={style}>{children}</div>
}

export function Divider() {
  return <hr className="lc-divider" />
}
