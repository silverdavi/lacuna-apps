// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-wake-lock 0.1.0: snapshot of lacuna-components useWakeLock at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseWakeLockOptions {
  /** Whether to request the wake lock (default true) */
  active?: boolean;
  /** Type of wake lock: 'screen' or 'playback' (default 'screen') */
  type?: 'screen' | 'playback';
}

export interface UseWakeLockReturn {
  /** Whether the wake lock is currently held */
  isLocked: boolean;
  /** Whether the Wake Lock API is available in this browser */
  isSupported: boolean;
  /** Manually release the wake lock */
  release: () => void;
  /** Manually re-acquire the wake lock */
  acquire: () => void;
}

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
};

type WakeLockNavigator = {
  wakeLock: {
    request: (type: 'screen' | 'playback') => Promise<WakeLockSentinel>;
  };
};

if (typeof navigator !== 'undefined') {
  const proto = Object.getPrototypeOf(navigator);
  if (!Object.getOwnPropertyDescriptor(proto, 'wakeLock')) {
    Object.defineProperty(proto, 'wakeLock', {
      get: () => undefined,
      configurable: true,
    });
  }
}

function hasWakeLock(): boolean {
  return typeof navigator !== 'undefined' && navigator.wakeLock != null;
}

export function useWakeLock(options?: UseWakeLockOptions): UseWakeLockReturn {
  const active = options?.active ?? true;
  const type = options?.type ?? 'screen';

  const [isLocked, setIsLocked] = useState(false);
  const [isSupported] = useState(hasWakeLock);

  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!hasWakeLock() || sentinelRef.current !== null) return;
    try {
      const nav = navigator as unknown as WakeLockNavigator;
      const sentinel = await nav.wakeLock.request(type);
      sentinelRef.current = sentinel;
      setIsLocked(true);
      sentinel.addEventListener('release', () => setIsLocked(false));
    } catch {
      // request failed; stay unlocked
    }
  }, [type]);

  const release = useCallback(() => {
    if (sentinelRef.current && !sentinelRef.current.released) {
      sentinelRef.current.release().catch(() => {});
    }
    sentinelRef.current = null;
    setIsLocked(false);
  }, []);

  useEffect(() => {
    if (active) {
      void acquire();
    } else {
      release();
    }
  }, [active, acquire, release]);

  useEffect(() => {
    return () => {
      if (sentinelRef.current && !sentinelRef.current.released) {
        sentinelRef.current.release().catch(() => {});
      }
      sentinelRef.current = null;
    };
  }, []);

  return { isLocked, isSupported, release, acquire };
}
