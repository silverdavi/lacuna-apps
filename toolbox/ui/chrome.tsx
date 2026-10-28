// App-agnostic shell chrome: brand home, breadcrumbs, back control.
// CSS: lc-brand-home, lc-cv-crumbs, lc-nav-back (ui.css).
// Apps that use a client router pass LinkComponent; otherwise <a href> is used.
import type { ComponentType, ReactNode } from 'react'
import { HoverLabel } from './hover'
import { Mark } from './mark'

type LinkProps = {
  to: string
  className?: string
  'aria-label'?: string
  children?: ReactNode
}

export type NavLink = ComponentType<LinkProps>

/** Lacuna mark + wordmark. Pass LinkComponent (e.g. react-router Link) for SPA nav. */
export function BrandHome({
  size = 17,
  href = '/',
  LinkComponent,
}: {
  size?: number
  href?: string
  LinkComponent?: NavLink
}) {
  const inner = (
    <>
      <Mark size={size} />
      <span className="lc-brandname">Lacuna</span>
    </>
  )
  if (LinkComponent) {
    return (
      <LinkComponent to={href} className="lc-brand-home" aria-label="Home">
        {inner}
      </LinkComponent>
    )
  }
  return (
    <a href={href} className="lc-brand-home" aria-label="Home">
      {inner}
    </a>
  )
}

export interface Crumb {
  label: string
  /** Omit `to` for the current (last) segment — rendered as plain text. */
  to?: string
  /** Prefer over `to` when the click must run shell motion (zoom-rect reverse). */
  onClick?: () => void
}

/** Trail of segments; every segment except the last is a link or button. */
export function Breadcrumbs({
  items,
  LinkComponent,
}: {
  items: Crumb[]
  LinkComponent?: NavLink
}) {
  if (items.length === 0) return null
  return (
    <nav className="lc-cv-crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => {
        const last = i === items.length - 1
        const Link = LinkComponent
        return (
          <span key={`${c.label}-${i}`} className="lc-crumb-seg">
            {i > 0 && <span className="lc-crumb-sep" aria-hidden>/</span>}
            {last || (!c.to && !c.onClick) ? (
              <span className="here" aria-current="page"><HoverLabel text={c.label} /></span>
            ) : c.onClick ? (
              <button type="button" onClick={c.onClick}><HoverLabel text={c.label} /></button>
            ) : Link ? (
              <Link to={c.to!}><HoverLabel text={c.label} /></Link>
            ) : (
              <a href={c.to}><HoverLabel text={c.label} /></a>
            )}
          </span>
        )
      })}
    </nav>
  )
}

/** One-level back control for window/app chrome. */
export function BackControl({ onBack, label = 'Back' }: { onBack: () => void; label?: string }) {
  return (
    <button type="button" className="lc-nav-back" onClick={onBack} aria-label={label} title={label}>
      ←
    </button>
  )
}
