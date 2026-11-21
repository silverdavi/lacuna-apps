// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// The app kit: the page frame and the few primitives every shelf app is built from.
// Markup uses the lc-* classes of ui.css (the same ones the Lacuna shell uses) plus lk-* from kit.css.
// Presentation only: no data access, no routing, no storage.
import type { CSSProperties, ReactNode } from 'react'
import { ICONS, type IconName } from './icons'
import { Mark } from './mark'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** The seven plate hues. One per app; pick by category. */
export const HUES = {
  rust: 'var(--geo-verm)',
  cobalt: 'var(--geo-cobalt)',
  blue: 'var(--geo-comm)',
  gold: 'var(--geo-gold)',
  green: 'var(--geo-green)',
  brown: 'var(--geo-legal)',
  teal: 'var(--geo-teal)',
} as const
export type Hue = keyof typeof HUES

/** Square icon plate: a glyph on a flat hue with a hairline ink border. */
export function Plate({ icon, hue = 'rust', size = 28 }: { icon: IconName; hue?: Hue; size?: number }) {
  const Glyph = ICONS[icon] ?? ICONS.grid
  return (
    <span className="lc-cv-plate" style={{ width: size, height: size, background: HUES[hue] }} aria-hidden>
      <span className="g"><Glyph size={size * 0.52} /></span>
    </span>
  )
}

/**
 * The page frame. Every app renders exactly one AppShell at the top of App.tsx.
 * It draws the dark band, the top bar (mark, APPS chip, breadcrumb), the framed app window with its
 * title bar, an optional right rail, and the status strip. Put panels (Card) inside it.
 * It owns the page landmarks (header, main, footer) and the h1: do not add another <main> or <h1>.
 */
export function AppShell({ name, icon = 'grid', hue = 'rust', category = 'Apps', meta, status, actions, side, children }: {
  /** App name, shown in the breadcrumb and as the page's h1 in the window title bar. */
  name: string
  icon?: IconName
  hue?: Hue
  /** First breadcrumb segment, e.g. "Finance". */
  category?: string
  /** Short count or state next to the name, e.g. "3 items". Rendered as a mono label. */
  meta?: ReactNode
  /** Text of the bottom status strip. */
  status?: ReactNode
  /** Buttons on the right of the window title bar. */
  actions?: ReactNode
  /** Right rail content: one or more <Rail>. */
  side?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="lc-desk lc-appview lk-shell">
      <header className="lk-top">
        <div className="lc-persona lk-band">
          <b>Lacuna apps</b>
          <span className="lc-persona-detail">Runs in your browser · stays on this device</span>
        </div>
        <div className="lc-desk-head">
          <span className="lc-brand-home">
            <Mark size={17} />
            <span className="lc-brandname">Lacuna</span>
          </span>
          <span className="lc-spacechip">APPS</span>
          <nav className="lc-cv-crumbs" aria-label="Breadcrumb">
            <span className="lc-crumb-seg"><span className="lk-crumb">{category}</span></span>
            <span className="lc-crumb-seg">
              <span className="lc-crumb-sep" aria-hidden>/</span>
              <span className="here" aria-current="page">{name}</span>
            </span>
          </nav>
        </div>
      </header>
      <main className="lc-app lc-win lc-win-active lk-win" style={{ ['--win-accent' as string]: HUES[hue] }}>
        <div className="lc-app-bar" style={{ borderTopColor: HUES[hue] }}>
          <Plate icon={icon} hue={hue} size={28} />
          <h1 className="name lk-name">{name}</h1>
          {meta != null && <span className="lc-mono lc-mono-sm lc-faint">{meta}</span>}
          <span className="lk-grow" />
          {actions}
        </div>
        <div className="lc-app-body">
          <div className="lc-app-main lk-main">{children}</div>
          {side != null && <section className="lc-app-side lk-side" aria-label="Details">{side}</section>}
        </div>
      </main>
      <footer className="lc-cv-statusbar lk-status"><span role="status">{status ?? 'Local · no network'}</span></footer>
    </div>
  )
}

/** One box in the right rail: serif title, rust mono note, then tag chips and any children. */
export function Rail({ title, note, chips, children }: { title: ReactNode; note?: ReactNode; chips?: string[]; children?: ReactNode }) {
  return (
    <div className="lc-envelope lk-rail">
      <div className="lc-title lc-title-md">{title}</div>
      {note != null && <div className="lc-mono lc-mono-sm lc-accent lk-rail-note">{note}</div>}
      {chips != null && chips.length > 0 && (
        <div className="lc-envelope-fields">
          {chips.map((c) => <span key={c} className="lc-chip">{c}</span>)}
        </div>
      )}
      {children != null && <div className="lk-rail-body">{children}</div>}
    </div>
  )
}

/** Small uppercase mono heading above a group. Renders an h2. */
export function SectionLabel({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <h2 className={cx('lc-mono', 'lk-section', accent && 'lc-accent')}>{children}</h2>
}

/** Labelled dropdown. */
export function Select({ label, value, onChange, options, error }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: (string | { value: string; label: string })[]
  error?: string | null
}) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      <select className="lc-input" value={value} aria-invalid={error ? true : undefined} onChange={(event) => onChange(event.target.value)}>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return <option key={opt.value} value={opt.value}>{opt.label}</option>
        })}
      </select>
      {error ? <span className="lk-field-error" role="alert">{error}</span> : null}
    </label>
  )
}

/** Labelled checkbox. */
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="lk-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/** A hairline-separated list. Children are <Row>. */
export function List({ children, label }: { children: ReactNode; label?: string }) {
  return <ul className="lk-list" aria-label={label}>{children}</ul>
}

/** One list row: title and meta on the left, a mono value and an action on the right. */
export function Row({ title, meta, value, action, hot, onClick }: {
  title: ReactNode
  meta?: ReactNode
  value?: ReactNode
  action?: ReactNode
  hot?: boolean
  onClick?: () => void
}) {
  const text = (
    <>
      <span className="lk-row-title">{title}</span>
      {meta != null && <span className="lk-row-meta">{meta}</span>}
    </>
  )
  return (
    <li className={cx('lk-row', hot && 'hot')}>
      {onClick ? <button type="button" className="lk-row-text" onClick={onClick}>{text}</button> : <span className="lk-row-text">{text}</span>}
      {value != null && <span className="lk-row-value">{value}</span>}
      {action}
    </li>
  )
}

/** What to show when something failed or the input is wrong. Announced to screen readers. */
export function ErrorState({ title, detail, mono = 'Error', children, style }: {
  title: ReactNode
  detail?: ReactNode
  mono?: string
  children?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className="lk-error" role="alert" style={style}>
      <div className="lc-mono lc-mono-sm lk-error-mono">{mono}</div>
      <div className="lc-empty-title">{title}</div>
      {detail != null && <div className="lc-body-sm">{detail}</div>}
      {children}
    </div>
  )
}
