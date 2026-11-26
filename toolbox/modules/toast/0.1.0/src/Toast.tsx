// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/toast 0.1.0: snapshot of lacuna-components Toast at 6188248 by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useRef, type ReactElement } from 'react';

export interface ToastProps {
  /** Message text to display. */
  message: string;
  /** Visual variant. Default 'info'. */
  variant?: 'info' | 'success' | 'error';
  /** Optional undo button label. If provided, an undo button is rendered. */
  undoLabel?: string;
  /** Callback when the undo button is clicked. */
  onUndo?: () => void;
  /** Callback when the toast is dismissed (auto or manual). */
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Default 5000. Set to 0 to disable. */
  duration?: number;
}

export function Toast(props: ToastProps): ReactElement {
  const { message, variant = 'info', undoLabel, onUndo, onDismiss, duration = 5000 } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const undoRef = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (duration <= 0) return;
    timer.current = window.setTimeout(() => dismissRef.current(), duration);
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, [duration]);

  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div
      ref={containerRef}
      role={role}
      aria-label={message}
      tabIndex={0}
      style={{
        position: 'fixed',
        bottom: 'calc(16px * var(--sf))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(8px * var(--sf))',
        padding: 'calc(12px * var(--sf)) calc(16px * var(--sf))',
        background: 'var(--ink)',
        color: 'var(--paper)',
        borderRadius: 'calc(8px * var(--sf))',
        boxShadow: '0 calc(2px * var(--sf)) calc(12px * var(--sf)) rgb(0 0 0 / 0.25)',
        fontFamily: 'var(--sans)',
        fontSize: 'calc(14px * var(--tf))',
        zIndex: 1000,
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onDismiss();
        }
      }}
    >
      <span>{message}</span>
      {undoLabel != null && (
        <button
          ref={undoRef}
          type="button"
          aria-label={undoLabel}
          onClick={(event) => {
            event.stopPropagation();
            onUndo?.();
          }}
          style={{
            marginLeft: 'calc(4px * var(--sf))',
            padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
            background: 'transparent',
            color: 'var(--paper)',
            border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
            borderRadius: 'calc(4px * var(--sf))',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
            fontSize: 'calc(12px * var(--tf))',
          }}
        >
          {undoLabel}
        </button>
      )}
    </div>
  );
}
