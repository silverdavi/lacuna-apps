// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-clipboard 0.1.0: snapshot of lacuna-components useClipboard at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseClipboardOptions {
  /** Milliseconds the `copied` flag stays true after a successful copy. Default 2000. */
  timeoutMs?: number;
  /** Called after a successful copy. */
  onSuccess?: () => void;
  /** Called after a failed copy. */
  onError?: (err: unknown) => void;
}

export interface UseClipboardReturn {
  /** The text currently staged for copying (last argument to `copy`). */
  text: string;
  /** True for `timeoutMs` after a successful copy. */
  copied: boolean;
  /** Copy `value` to the clipboard. Accepts a string or a Blob (image). */
  copy: (value: string | Blob) => Promise<void>;
  /** Reset `copied` to false immediately. */
  reset: () => void;
}

export function useClipboard(options?: UseClipboardOptions): UseClipboardReturn {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeoutMs = options?.timeoutMs ?? 2000;
  const onSuccessRef = useRef(options?.onSuccess);
  onSuccessRef.current = options?.onSuccess;
  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;
  const timeoutRef = useRef(timeoutMs);
  timeoutRef.current = timeoutMs;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setCopied(false);
  }, [clearTimer]);

  const copy = useCallback(
    async (value: string | Blob) => {
      try {
        if (typeof value === 'string') {
          await navigator.clipboard.writeText(value);
          setText(value);
        } else {
          const Ctor: (new (d: Record<string, Blob>) => ClipboardItem) | undefined =
            globalThis.ClipboardItem;
          const item = Ctor ? new Ctor({ [value.type]: value }) : (value as unknown as ClipboardItem);
          await navigator.clipboard.write([item]);
        }
        setCopied(true);
        clearTimer();
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setCopied(false);
        }, timeoutRef.current);
        onSuccessRef.current?.();
      } catch (err) {
        onErrorRef.current?.(err);
        throw err;
      }
    },
    [clearTimer]
  );

  return { text, copied, copy, reset };
}
