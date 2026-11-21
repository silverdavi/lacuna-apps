// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// Platform behavior that is code, not prose. Twin of the product launcher controls
// (one primary button, 24px hit target, focus ring, empty state that names the next action).
// AppShell owns name, hue, and category. The two shells cannot share a file.
// Keep these class names on both: lc-btn primary, lc-empty, and the :focus-visible ring in kit.css.
import type { ReactNode } from 'react'

/** Minimum hit target, in CSS pixels. kit.css applies it to .lc-btn. */
export const HIT_MIN_PX = 24

/** The focus ring kit.css paints on :focus-visible. Apps do not set outline. */
export const FOCUS_RING = '2px solid var(--accent)'

/** The one primary action. There is no second primary style. */
export function PrimaryButton({ children, onClick, disabled, type = 'button', ariaLabel, title }: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string
  title?: string
}) {
  return (
    <button type={type} className="lc-btn primary" onClick={onClick} disabled={disabled} aria-label={ariaLabel} title={title}>
      {children}
    </button>
  )
}

/**
 * Empty surface. `actionLabel` is the next thing the person can do.
 * Apps born with this module must pass it (design-lint). It stays optional in the
 * type so an app that already calls EmptyState still typechecks until it is rebuilt.
 * Pass `onAction` to draw that label as the primary button; otherwise it is shown as text.
 */
export function EmptyState({ title, detail, mono, actionLabel, onAction, children }: {
  title: ReactNode
  detail?: ReactNode
  mono?: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}) {
  return (
    <div className="lc-empty">
      {mono && <div className="lc-mono lc-mono-sm lc-faint">{mono}</div>}
      <div className="lc-empty-title">{title}</div>
      {detail && <div className="lc-body-sm">{detail}</div>}
      {actionLabel ? (
        onAction ? (
          <button type="button" className="lc-btn primary" onClick={onAction}>{actionLabel}</button>
        ) : (
          <div className="lc-mono lc-mono-sm lc-accent">{actionLabel}</div>
        )
      ) : null}
      {children}
    </div>
  )
}
