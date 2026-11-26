// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/confirm-dialog 0.1.0: snapshot of lacuna-components ConfirmDialog at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useId, useRef } from 'react'
import type { ReactElement } from 'react'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ConfirmDialog(props: ConfirmDialogProps): ReactElement | null {
  const { open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel } = props
  const titleId = useId()
  const messageId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onConfirmRef = useRef(onConfirm)
  const onCancelRef = useRef(onCancel)
  onConfirmRef.current = onConfirm
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!open) return
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
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
        onCancelRef.current()
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

  const confirmColor = danger ? 'var(--danger)' : 'var(--ink)'

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancelRef.current()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backgroundColor: 'rgb(0 0 0 / 0.4)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        style={{
          position: 'relative',
          backgroundColor: 'var(--paper)',
          color: 'var(--ink)',
          border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
          borderRadius: 'calc(8px * var(--sf))',
          padding: 'calc(24px * var(--sf))',
          maxWidth: 'calc(440px * var(--sf))',
          width: '100%',
          margin: 'calc(16px * var(--sf))',
          outline: 'none',
          fontFamily: 'var(--sans)',
          minHeight: 'calc(160px * var(--sf))',
        }}
      >
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 'calc(16px * var(--tf))',
            lineHeight: 1.4,
            color: 'var(--ink)',
          }}
        >
          {title}
        </h2>
        {message && (
          <p
            id={messageId}
            style={{
              margin: 'calc(8px * var(--sf)) 0 calc(24px * var(--sf))',
              fontSize: 'calc(14px * var(--tf))',
              lineHeight: 1.5,
              color: 'var(--ink)',
            }}
          >
            {message}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'calc(8px * var(--sf))',
            marginTop: message ? 'calc(24px * var(--sf))' : 'calc(24px * var(--sf))',
          }}
        >
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onCancelRef.current()}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(14px * var(--tf))',
              padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
              backgroundColor: 'var(--paper)',
              color: 'var(--ink)',
              border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
              borderRadius: 'calc(6px * var(--sf))',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirmRef.current()}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(14px * var(--tf))',
              padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
              backgroundColor: confirmColor,
              color: 'var(--paper)',
              border: 'none',
              borderRadius: 'calc(6px * var(--sf))',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
