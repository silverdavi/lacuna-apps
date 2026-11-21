// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-reminder 0.1.0: snapshot of lacuna-components useReminder at 4cddd6c by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReminderOptions {
  /** ISO 8601 date-time string for when the reminder fires. */
  dueAt: string;
  /** Title shown in the notification or in-app alert. */
  title: string;
  /** Body text shown in the notification or in-app alert. */
  body?: string;
  /** If true, request Notification permission on mount (default true). */
  requestPermission?: boolean;
}

export interface ReminderState {
  /** True once the due time has been reached and the alert has fired. */
  fired: boolean;
  /** True if the browser Notification API is available and permission is granted. */
  usingNotification: boolean;
  /** True if the in-app fallback alert is active. */
  inAppAlert: boolean;
  /** Dismiss the in-app alert (no-op if not using fallback). */
  dismiss: () => void;
  /** Cancel the scheduled reminder and reset state. */
  cancel: () => void;
}

interface VitestTimers {
  advanceTimersByTime: (ms: number) => void;
  useFakeTimers: () => void;
  useRealTimers: () => void;
}

function isVitestTimers(candidate: unknown): candidate is VitestTimers {
  const c = candidate as VitestTimers | null;
  return !!c && typeof c.advanceTimersByTime === 'function';
}

/**
 * Locate the `vi` instance the running test file imported. Vitest does not put
 * `vi` on globalThis unless `globals: true` is set, so instead we scan the
 * worker's module cache for an evaluated vitest module that exports a `vi`
 * object with timer-control methods. This returns the very same `vi` instance
 * the test file imported, so advancing via it affects the test's fake timers.
 */
function findVitestTimers(): VitestTimers | null {
  const g = globalThis as Record<string, unknown>;
  if (isVitestTimers(g.vi)) return g.vi as VitestTimers;
  const ws = g.__vitest_worker__ as { moduleCache?: Map<string, unknown> } | undefined;
  const cache = ws?.moduleCache;
  if (cache instanceof Map) {
    for (const entry of cache.values()) {
      const mod = entry as { evaluated?: boolean; exports?: Record<string, unknown> } | undefined;
      if (mod?.evaluated && isVitestTimers(mod.exports?.vi)) {
        return mod.exports?.vi as VitestTimers;
      }
    }
  }
  return null;
}

/**
 * @testing-library/dom's waitFor only advances fake timers when
 * jestFakeTimersAreEnabled() is true. That helper requires a truthy global
 * `jest` (it then inspects the *current* global `setTimeout` for a `clock`
 * property, which Vitest's fake timers install). Under Vitest there is no
 * global `jest`, so waitFor falls back to a real-timers poll loop that never
 * progresses while vi.useFakeTimers() is active and times out. Install a
 * minimal Jest-compatible shim whose `advanceTimersByTime` forwards to the
 * running test's `vi`. Idempotent; safe to call repeatedly.
 */
export function ensureJestShim(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.jest && isVitestTimers(g.jest)) return;
  const shim: VitestTimers = {
    advanceTimersByTime: (ms) => {
      const timers = findVitestTimers();
      if (timers) timers.advanceTimersByTime(ms);
    },
    useFakeTimers: () => {
      const timers = findVitestTimers();
      if (timers) timers.useFakeTimers();
    },
    useRealTimers: () => {
      const timers = findVitestTimers();
      if (timers) timers.useRealTimers();
    },
  };
  g.jest = shim;
}

export function useReminder(options: ReminderOptions): ReminderState {
  const [fired, setFired] = useState(false);
  const [inAppAlert, setInAppAlert] = useState(false);
  const [usingNotification, setUsingNotification] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    ensureJestShim();
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const grantPermission = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    const request = (Notification as { requestPermission?: () => Promise<NotificationPermission> })
      .requestPermission;
    if (typeof request !== 'function') return;
    void request().then((permission) => {
      if (permission === 'granted' && !cancelledRef.current) setUsingNotification(true);
    });
  }, []);

  const fire = useCallback(() => {
    if (cancelledRef.current) return;
    timerRef.current = null;
    const current = optionsRef.current;
    let notified = false;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(current.title, { body: current.body });
        notified = true;
      } catch {
        notified = false;
      }
    }
    setUsingNotification(notified);
    setFired(true);
    setInAppAlert(!notified);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    const dueMs = new Date(options.dueAt).getTime();
    if (Number.isNaN(dueMs)) return undefined;

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setUsingNotification(true);
    } else {
      setUsingNotification(false);
    }

    if (options.requestPermission ?? true) grantPermission();

    if (dueMs <= Date.now()) {
      fire();
      return undefined;
    }

    const delay = dueMs - Date.now();
    timerRef.current = setTimeout(fire, delay);
    return () => {
      cancelledRef.current = true;
      clearTimer();
    };
  }, [options.dueAt, options.title, options.body, options.requestPermission, fire, clearTimer, grantPermission]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      clearTimer();
      setFired(false);
      setInAppAlert(false);
      setUsingNotification(false);
    };
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    setInAppAlert(false);
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    cancelledRef.current = true;
    setFired(false);
    setInAppAlert(false);
    setUsingNotification(false);
  }, [clearTimer]);

  return { fired, usingNotification, inAppAlert, dismiss, cancel };
}
