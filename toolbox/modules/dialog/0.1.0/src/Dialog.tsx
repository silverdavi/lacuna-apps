// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/dialog 0.1.0: snapshot of lacuna-components Dialog at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const headingId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    if (panel) {
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length > 0) {
        focusables[0]?.focus()
      } else {
        panel.focus()
      }
    }
  }, [open])

  useEffect(() => {
    if (open) return
    if (previouslyFocused.current === null) return
    previouslyFocused.current.focus()
    previouslyFocused.current = null
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) return
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        style={{
          position: 'relative',
          backgroundColor: 'var(--paper)',
          color: 'var(--ink)',
          border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
          borderRadius: 'calc(8px * var(--sf))',
          padding: 'calc(24px * var(--sf))',
          maxWidth: 'calc(480px * var(--sf))',
          width: '100%',
          margin: 'calc(16px * var(--sf))',
          outline: 'none',
          fontFamily: 'var(--sans)',
        }}
      >
        <h2
          id={headingId}
          style={{
            margin: 0,
            fontSize: 'calc(16px * var(--tf))',
            lineHeight: 1.4,
            color: 'var(--ink)',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
