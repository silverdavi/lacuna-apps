// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-timer 0.1.0: snapshot of lacuna-components useTimer at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';
import './storage';

export interface TimerOptions {
  /** Initial duration in milliseconds. If omitted, the timer runs as a stopwatch (no end). */
  initialDurationMs?: number;
  /** Key under which state is persisted in localStorage. Defaults to 'lacuna-timer'. */
  storageKey?: string;
  /** If true, the timer starts running on a fresh mount (no saved state). Defaults to false. */
  autoStart?: boolean;
}

export interface TimerState {
  /** True when the timer is actively counting. */
  running: boolean;
  /** Elapsed milliseconds since start (stopwatch) or since the last reset. */
  elapsedMs: number;
  /** Remaining milliseconds (countdown only: initialDurationMs - elapsedMs, floored at 0). Null in stopwatch mode. */
  remainingMs: number | null;
  /** Recorded lap times in milliseconds, oldest first. */
  laps: number[];
}

export interface TimerControls {
  /** Start or resume the timer. If a countdown has already reached zero, restarts it from the full duration. */
  start: () => void;
  /** Pause the timer. No-op if not running. */
  pause: () => void;
  /** Stop the timer and reset elapsed to zero. In countdown mode remainingMs returns to the duration. Laps are cleared. */
  reset: () => void;
  /** Record a lap. Returns the updated laps array. */
  lap: () => number[];
  /** Change the countdown duration and reset. Negative values clamp to zero. */
  setDuration: (ms: number) => void;
}

interface Stored {
  running: boolean;
  elapsedMs: number;
  durationMs: number | null;
  laps: number[];
}

const DEFAULT_KEY = 'lacuna-timer';

function sanitize(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseDuration(p: Record<string, unknown>): number | null {
  const v = (p as { durationMs?: unknown }).durationMs ?? (p as { initialDurationMs?: unknown }).initialDurationMs;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

function load(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const p = JSON.parse(raw);
    if (typeof p !== 'object' || p === null) return null;
    const rec = p as Record<string, unknown>;
    return {
      running: rec.running === true,
      elapsedMs: sanitize(rec.elapsedMs),
      durationMs: parseDuration(rec),
      laps: Array.isArray(rec.laps) ? (rec.laps as unknown[]).map(sanitize) : [],
    };
  } catch {
    return null;
  }
}

export function useTimer(options?: TimerOptions): [TimerState, TimerControls] {
  const initialDurationMs = options?.initialDurationMs;
  const storageKey = options?.storageKey ?? DEFAULT_KEY;
  const autoStart = options?.autoStart ?? false;

  const [durationMs, setDurationMs] = useState<number | null>(
    initialDurationMs === undefined ? null : initialDurationMs,
  );
  const [running, setRunning] = useState(false);
  const [elapsedBase, setElapsedBase] = useState(0);
  const [startStamp, setStartStamp] = useState<number | null>(null);
  const [laps, setLaps] = useState<number[]>([]);
  const [tick, setTick] = useState(0);
  const [restored, setRestored] = useState(false);

  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;
  const baseRef = useRef(elapsedBase);
  baseRef.current = elapsedBase;
  const stampRef = useRef(startStamp);
  stampRef.current = startStamp;
  const runningRef = useRef(running);
  runningRef.current = running;
  const lapsRef = useRef(laps);
  lapsRef.current = laps;

  const effectiveElapsed = useCallback((): number => {
    const stamp = stampRef.current;
    if (runningRef.current && stamp !== null) {
      return baseRef.current + (Date.now() - stamp);
    }
    return baseRef.current;
  }, []);

  const persist = useCallback(
    (override?: Partial<Stored>) => {
      const snapshot: Stored = {
        running: runningRef.current,
        elapsedMs: effectiveElapsed(),
        durationMs: durationRef.current,
        laps: lapsRef.current,
        ...override,
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        // storage unavailable; the timer still works in memory
      }
    },
    [storageKey, effectiveElapsed],
  );

  useEffect(() => {
    const stored = load(storageKey);
    if (stored !== null) {
      const isMeaningful = stored.elapsedMs > 0 || stored.laps.length > 0 || stored.running;
      if (isMeaningful) {
        setDurationMs(stored.durationMs);
      }
      setElapsedBase(stored.elapsedMs);
      setLaps(stored.laps);
      if (stored.running) {
        setStartStamp(Date.now());
        setRunning(true);
      } else {
        setStartStamp(null);
        setRunning(false);
      }
    } else if (autoStart) {
      setElapsedBase(0);
      setStartStamp(Date.now());
      setRunning(true);
    }
    setRestored(true);
  }, [storageKey, autoStart, persist]);

  useEffect(() => {
    if (!restored) return;
    if (!running || startStamp === null) return;
    const dur = durationRef.current;
    if (dur !== null && effectiveElapsed() >= dur) {
      setElapsedBase(dur);
      setStartStamp(null);
      setRunning(false);
      persist({ running: false, elapsedMs: dur });
      return;
    }
    const id = window.setInterval(() => setTick((n) => n + 1), 25);
    return () => window.clearInterval(id);
  }, [restored, running, startStamp, tick, durationMs, elapsedBase, effectiveElapsed, persist]);

  // Persist on every meaningful state change so a reload restores the
  // current running/paused state and progress.
  useEffect(() => {
    if (!restored) return;
    persist();
  }, [restored, running, elapsedBase, durationMs, laps, startStamp, persist]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    const dur = durationRef.current;
    if (dur !== null && baseRef.current >= dur) {
      setElapsedBase(0);
    } else {
      setElapsedBase(effectiveElapsed());
    }
    setStartStamp(Date.now());
    setRunning(true);
  }, [effectiveElapsed]);

  const pause = useCallback(() => {
    if (!runningRef.current) return;
    setElapsedBase(effectiveElapsed());
    setStartStamp(null);
    setRunning(false);
  }, [effectiveElapsed]);

  const reset = useCallback(() => {
    setElapsedBase(0);
    setStartStamp(null);
    setRunning(false);
    setLaps([]);
    persist({ running: false, elapsedMs: 0, laps: [] });
  }, [persist]);

  const lap = useCallback((): number[] => {
    const next = [...lapsRef.current, effectiveElapsed()];
    setLaps(next);
    return next;
  }, [effectiveElapsed]);

  const setDuration = useCallback((ms: number) => {
    const dur = Math.max(0, Math.floor(ms));
    setDurationMs(dur);
    setElapsedBase(0);
    setStartStamp(null);
    setRunning(false);
    setLaps([]);
  }, []);

  const elapsedMs = running && startStamp !== null ? elapsedBase + (Date.now() - startStamp) : elapsedBase;
  const remainingMs = durationMs === null ? null : Math.max(0, durationMs - elapsedMs);

  const state: TimerState = { running, elapsedMs, remainingMs, laps };
  const controls: TimerControls = { start, pause, reset, lap, setDuration };

  return [state, controls];
}
