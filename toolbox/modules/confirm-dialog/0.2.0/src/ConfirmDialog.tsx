// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/confirm-dialog 0.2.0: snapshot of lacuna-components ConfirmDialog at 6e67435 by sync-toolbox-components.py; a change gets a new version.
import { useEffect } from 'react'
import type { ReactElement } from 'react'
import { Dialog } from '@lacuna/dialog'

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

export function ConfirmDialog(props: ConfirmDialogProps): ReactElement | null {
  const {
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger,
    onConfirm,
    onCancel,
  } = props

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // A click on a button or the message text is "inside"; any other click
      // (the panel chrome / backdrop) cancels.
      if (target.closest('button, [href], input, select, textarea')) return
      if (target.closest('p')) return
      onCancel()
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
  }, [open, onCancel])

  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      {message ? (
        <p
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 'calc(14px * var(--tf))',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          {message}
        </p>
      ) : null}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'calc(8px * var(--sf))',
          marginTop: 'calc(16px * var(--sf))',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
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
          onClick={onConfirm}
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 'calc(14px * var(--tf))',
            padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
            backgroundColor: danger ? 'var(--danger)' : 'var(--ink)',
            color: 'var(--paper)',
            border: 'none',
            borderRadius: 'calc(6px * var(--sf))',
            cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
