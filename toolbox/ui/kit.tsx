// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// Platform chrome for every community app. Twin of the product launcher shell
// (BrandHome, Breadcrumbs, and the desk header that every window renders).
// Apps pass name (the window title), hue, and category. This file owns the logo
// link, the APPS link, the category breadcrumb, the window title, and the focus ring.
// The two shells cannot share a file. Keep those prop names, and the current-page
// treatment (ink word, 2px accent underline in kit.css), the same on both.
// The app kit: the page frame and the few primitives every shelf app is built from.
// Markup uses the lc-* classes of ui.css (the same ones the Lacuna shell uses) plus lk-* from kit.css.
// Presentation only: no data access, no routing, no storage.
import { createContext, Fragment, isValidElement, useContext, type CSSProperties, type ReactNode } from 'react'
import { ICONS, type IconName } from './icons'
import { Mark } from './mark'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

const ShellNameContext = createContext<string>('')

const SELF_NARRATION_SEGMENT = /^(local|no network|works offline|stays on this device|saved on this device|on this device|settings saved on this device|settings persist|runs in your browser)$/i

function cleanSegments(text: string): string {
  return text
    .split(/\s*·\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !SELF_NARRATION_SEGMENT.test(part))
    .join(' · ')
}

function cleanStatus(status: ReactNode): ReactNode {
  if (status == null) return null
  if (typeof status === 'string') {
    const cleaned = cleanSegments(status)
    return cleaned.length > 0 ? cleaned : null
  }
  return status
}

function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.self !== window.top) return true
  } catch {
    return true
  }
  try {
    return new URLSearchParams(window.location.search).get('embed') === '1'
  } catch {
    return false
  }
}

function hasSubstantiveNode(node: ReactNode): boolean {
  if (node == null || typeof node === 'boolean') return false
  if (typeof node === 'number') return true
  if (typeof node === 'string') return /\d/.test(node)
  if (Array.isArray(node)) return node.some(hasSubstantiveNode)
  if (!isValidElement(node)) return false
  const props = node.props as { children?: ReactNode }
  const t = node.type
  if (t === Fragment) return hasSubstantiveNode(props.children)
  if (typeof t === 'string') {
    if (t === 'p' || t === 'span' || t === 'div' || t === 'small' || t === 'em' || t === 'strong') {
      return hasSubstantiveNode(props.children)
    }
    return true
  }
  if (typeof t === 'function' && (t as { __lkProse?: boolean }).__lkProse === true) {
    return hasSubstantiveNode(props.children)
  }
  return true
}

function hasSubstantiveSide(side: ReactNode, shellName: string): boolean {
  if (side == null || typeof side === 'boolean') return false
  if (Array.isArray(side)) return side.some((item) => hasSubstantiveSide(item, shellName))
  if (!isValidElement(side)) return true
  if (side.type === Fragment) {
    return hasSubstantiveSide((side.props as { children?: ReactNode }).children, shellName)
  }
  if (side.type === Rail) {
    const p = side.props as { title?: ReactNode; note?: ReactNode; chips?: string[]; children?: ReactNode }
    const sameTitle = typeof p.title === 'string' && p.title.trim().toLowerCase() === shellName.trim().toLowerCase()
    if (!sameTitle) return true
    if ((p.chips ?? []).some((c) => /\d/.test(c))) return true
    return hasSubstantiveNode(p.children)
  }
  return true
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

/** Where the top bar leads: the Lacuna desktop, which lists the apps. Plain links; nothing is requested at load. */
const HOME = 'https://lacunaos.com/'

/**
 * The page frame. Every app renders exactly one AppShell at the top of App.tsx.
 * Standalone, it draws the desk header (mark, APPS chip, breadcrumb) above the framed app window.
 * Embedded inside the Lacuna launcher frame, the host already draws the desk header, so AppShell
 * omits its own top bar and renders only the paper desktop ground and the single app window.
 * It owns the page landmarks and the h1: do not add another <main> or <h1>.
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
  /** Live status text for the bottom strip. Omitted when empty. */
  status?: ReactNode
  /** Buttons on the right of the window title bar. */
  actions?: ReactNode
  /** Right rail content: one or more <Rail> with controls, totals, or shortcuts. */
  side?: ReactNode
  children: ReactNode
}) {
  const embedded = isEmbedded()
  const liveStatus = cleanStatus(status)
  const showSide = hasSubstantiveSide(side, name)
  return (
    <ShellNameContext.Provider value={name}>
      <div className={cx('lc-desk', 'lc-appview', 'lk-shell', embedded && 'lk-embedded')}>
        {!embedded && (
          <header className="lk-top">
            <div className="lc-desk-head">
              <a className="lc-brand-home" href={HOME} target="_top" aria-label="Lacuna home">
                <Mark size={17} />
                <span className="lc-brandname">Lacuna</span>
              </a>
              <a className="lc-spacechip" href={HOME} target="_top" aria-label="Apps on Lacuna">APPS</a>
              <nav className="lc-cv-crumbs" aria-label="Breadcrumb">
                <span className="lc-crumb-seg"><a className="lk-crumb" href={HOME} target="_top">{category}</a></span>
                <span className="lc-crumb-seg">
                  <span className="lc-crumb-sep" aria-hidden>/</span>
                  <span className="here" aria-current="page">{name}</span>
                </span>
              </nav>
            </div>
          </header>
        )}
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
            {showSide && <section className="lc-app-side lk-side" aria-label="Details">{side}</section>}
          </div>
        </main>
        {liveStatus != null && (
          <footer className="lc-cv-statusbar lk-status"><span role="status">{liveStatus}</span></footer>
        )}
      </div>
    </ShellNameContext.Provider>
  )
}

/** One box in the right rail: optional section title, mono note, live chips, and secondary controls or KPIs. */
export function Rail({ title, note, chips, children }: { title?: ReactNode; note?: ReactNode; chips?: string[]; children?: ReactNode }) {
  const shellName = useContext(ShellNameContext)
  const showTitle = title != null && !(typeof title === 'string' && shellName && title.trim().toLowerCase() === shellName.trim().toLowerCase())
  const cleanedNote = typeof note === 'string' ? (cleanSegments(note) || null) : note
  const cleanedChips = (chips ?? []).filter((c) => c.trim().length > 0 && !SELF_NARRATION_SEGMENT.test(c.trim()))
  if (!showTitle && cleanedNote == null && cleanedChips.length === 0 && children == null) return null
  return (
    <div className="lc-envelope lk-rail">
      {showTitle && <div className="lc-title lc-title-md">{title}</div>}
      {cleanedNote != null && <div className="lc-mono lc-mono-sm lc-accent lk-rail-note">{cleanedNote}</div>}
      {cleanedChips.length > 0 && (
        <div className="lc-envelope-fields">
          {cleanedChips.map((c) => <span key={c} className="lc-chip">{c}</span>)}
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

/** A game or puzzle board: a fixed-size grid of square cells. Give it one child per cell, row by row; the kit draws
 *  the frame and the grid lines, the app sets only each cell's `background` (and its own data- attributes). */
export function Board({ cols, rows, cell = 28, label, children, style }: {
  cols: number
  rows: number
  cell?: number
  label?: string
  children: ReactNode
  style?: CSSProperties
}) {
  const vars = { '--cols': cols, '--rows': rows, '--cell': `${cell}px` } as CSSProperties
  return (
    <div className="lk-board" role="group" aria-label={label} style={{ ...vars, ...style }}>
      {children}
    </div>
  )
}

/** Keyboard hints: a keycap and what it does, one pair per line. */
export function Keys({ items }: { items: [string, string][] }) {
  return (
    <dl className="lk-keys">
      {items.map(([key, what]) => (
        <div key={key + what} className="lk-key-row">
          <dt><kbd className="lk-kbd">{key}</kbd></dt>
          <dd>{what}</dd>
        </div>
      ))}
    </dl>
  )
}
