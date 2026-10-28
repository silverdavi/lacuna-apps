import type { CSSProperties, ReactNode } from 'react'
import { HoverLabel } from './hover'
import './tokens.css'
import './ui.css'

export { Mark } from './mark'
export { BrandHome, Breadcrumbs, BackControl } from './chrome'
export type { Crumb, NavLink } from './chrome'
export { ResizablePanel } from './layout'
export { ICONS, SUITE_ICONS, iconForFlow } from './icons'
export type { IconName, IconProps } from './icons'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function EmptyState({
  title,
  detail,
  mono,
  children,
}: {
  title: ReactNode
  detail?: ReactNode
  mono?: string
  children?: ReactNode
}) {
  return (
    <div className="lc-empty">
      {mono && <div className="lc-mono lc-mono-sm lc-faint">{mono}</div>}
      <div className="lc-empty-title">{title}</div>
      {detail && <div className="lc-body-sm">{detail}</div>}
      {children}
    </div>
  )
}

export function Title({ children, size = 'lg', style }: { children: ReactNode; size?: 'xl' | 'lg' | 'md'; style?: CSSProperties }) {
  return <div className={`lc-title lc-title-${size}`} style={style}>{children}</div>
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

export function Button({ children, kind = 'secondary', onClick, style }: {
  children: ReactNode
  kind?: 'primary' | 'secondary' | 'ghost' | 'ink'
  onClick?: () => void
  style?: CSSProperties
}) {
  return <button type="button" className={`lc-btn ${kind}`} onClick={onClick} style={style}>{children}</button>
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

export function Table({ columns, rows }: {
  columns: { key: string; label: ReactNode; num?: boolean }[]
  rows: { cells: Record<string, ReactNode>; hot?: boolean }[]
}) {
  return (
    <table className="lc-table">
      <thead>
        <tr>{columns.map((c) => <th key={c.key} className={c.num ? 'num' : undefined}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.hot ? 'hot' : undefined}>
            {columns.map((c) => (
              <td key={c.key} className={c.num ? 'num' : undefined}>{r.cells[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
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

export function TextInput({ label, value, onChange, rows }: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      {rows ? (
        <textarea className="lc-input" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="lc-input" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  )
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
