// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-hotkeys 0.1.0: snapshot of lacuna-components useHotkeys at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface HotkeyBinding {
  keys: string;
  handler: (event: KeyboardEvent) => void;
  description?: string;
}

export interface UseHotkeysOptions {
  enabled?: boolean;
  scope?: string;
}

export interface UseHotkeysReturn {
  bindings: ReadonlyArray<HotkeyBinding>;
  unregister: (keys: string) => void;
}

type ParsedKey = {
  key: string;
  shift: boolean;
  meta: boolean;
  control: boolean;
};

function parseKeys(spec: string): ParsedKey | null {
  const parts = spec.toLowerCase().split('+');
  const out: ParsedKey = { key: '', shift: false, meta: false, control: false };
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) return null;
    if (part === 'shift') out.shift = true;
    else if (part === 'mod' || part === 'meta' || part === 'cmd') out.meta = true;
    else if (part === 'ctrl' || part === 'control') out.control = true;
    else out.key = part;
  }
  if (!out.key) return null;
  return out;
}

function isEditableElement(el: EventTarget | null | undefined): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable;
}

function isEditableTarget(event: KeyboardEvent): boolean {
  if (isEditableElement(event.target)) return true;
  if (typeof document !== 'undefined') {
    return isEditableElement(document.activeElement);
  }
  return false;
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as { userAgent?: string; platform?: string };
  const platform = nav.platform ?? '';
  if (platform) return /Mac/i.test(platform);
  const ua = nav.userAgent ?? '';
  return /Macintosh|iPhone|iPad|iPod/i.test(ua);
}

function matchBinding(
  parsed: ParsedKey,
  event: KeyboardEvent,
  mac: boolean
): boolean {
  const meta = event.metaKey;
  const control = event.ctrlKey;
  const shift = event.shiftKey;
  if (parsed.meta && parsed.control) return false;
  if (parsed.meta) {
    if (!(mac ? meta : control)) return false;
  } else if (parsed.control) {
    if (!control) return false;
  } else {
    if (meta || control) return false;
  }
  if (parsed.shift !== shift) return false;
  return parsed.key === event.key.toLowerCase();
}

export function useHotkeys(
  bindings: HotkeyBinding[],
  options?: UseHotkeysOptions
): UseHotkeysReturn {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());

  const bindingsRef = useRef<ReadonlyArray<HotkeyBinding>>(bindings);
  bindingsRef.current = bindings;
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const enabledRef = useRef<boolean>(options?.enabled ?? true);
  enabledRef.current = options?.enabled ?? true;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current) return;
      if (isEditableTarget(event)) return;
      const mac = isMacPlatform();
      for (const binding of bindingsRef.current) {
        if (hiddenRef.current.has(binding.keys)) continue;
        const parsed = parseKeys(binding.keys);
        if (!parsed) continue;
        if (!matchBinding(parsed, event, mac)) continue;
        event.preventDefault();
        binding.handler(event);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const unregister = useCallback((keys: string) => {
    setHidden((prev) => {
      if (prev.has(keys)) return prev;
      const next = new Set(prev);
      next.add(keys);
      return next;
    });
  }, []);

  const currentBindings = useMemo(
    () => bindings.filter((b) => !hidden.has(b.keys)),
    [bindings, hidden]
  );

  return {
    bindings: currentBindings,
    unregister,
  };
}
