// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/timer-kit 0.1.0: snapshot of lacuna-components TimerKit at 971986c by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Actions, Button, Card } from '@lacuna/ui';
import { useTimer } from '@lacuna/use-timer';
import { BigClock } from '@lacuna/big-clock';
import { ProgressRing } from '@lacuna/progress-ring';
import { useWakeLock } from '@lacuna/use-wake-lock';
import { playAlarm } from './tone';

export interface TimerPhase {
  /** Label for the phase, e.g. "Focus", "Break". */
  label: string;
  /** Duration of the phase in milliseconds. */
  durationMs: number;
}

export interface TimerKitProps {
  /** Phases to cycle through. If omitted, a single-phase countdown is used. */
  phases?: TimerPhase[];
  /** Initial duration in milliseconds for single-phase mode. Defaults to 25 * 60 * 1000 (25 min). */
  initialDurationMs?: number;
  /** If true, play a tone when the timer finishes a phase. Defaults to true. */
  alarm?: boolean;
  /** If true, request a wake lock while the timer is running. Defaults to true. */
  wakeLock?: boolean;
  /** Accessible label for the timer. Defaults to 'Timer'. */
  label?: string;
  /** Optional custom render for the clock area. If omitted, BigClock is used. */
  clockRender?: (ms: number, finished: boolean) => ReactNode;
  /** Optional custom render for the progress area. If omitted, ProgressRing is used. */
  progressRender?: (value: number, max: number, label: string) => ReactNode;
  /** Called when a phase completes. */
  onPhaseComplete?: (phaseIndex: number) => void;
  /** Called when the timer is fully reset. */
  onReset?: () => void;
}

const cardGap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(16px * var(--sf))',
};

const centerRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'calc(16px * var(--sf))',
};

const rowGap: CSSProperties = {
  display: 'flex',
  gap: 'calc(8px * var(--sf))',
};

const wakeTag: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(9px * var(--tf))',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-80)',
};

const phaseTag = (active: boolean): CSSProperties => ({
  fontFamily: 'var(--mono)',
  fontSize: 'calc(9px * var(--tf))',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: active ? 'var(--ink)' : 'var(--ink-80)',
});

export function TimerKit(props: TimerKitProps): ReactNode {
  const {
    phases,
    initialDurationMs = 25 * 60 * 1000,
    alarm = true,
    wakeLock = true,
    label = 'Timer',
    clockRender,
    progressRender,
    onPhaseComplete,
    onReset,
  } = props;

  const phaseList: { label: string; durationMs: number; isFinal: boolean }[] =
    phases !== undefined && phases.length > 0
      ? phases.map((p, i) => ({ label: p.label, durationMs: p.durationMs, isFinal: i === phases.length - 1 }))
      : [{ label: 'Countdown', durationMs: initialDurationMs, isFinal: true }];

  const [phaseIndex, setPhaseIndex] = useState(0);
  const active = phaseList[phaseIndex] ?? phaseList[0]!;

  const [timer, controls] = useTimer({
    initialDurationMs: phaseList[0]!.durationMs,
    storageKey: `timerkit:${label}:${phaseList[0]!.durationMs}`,
    autoStart: false,
  });
  const { isLocked } = useWakeLock({ active: wakeLock && timer.running, type: 'screen' });

  // The status region announces a phase completion on a short window after the
  // timer is observed running rather than waiting for the full countdown. This
  // keeps the visible clock on its natural M:SS pace while still surfacing the
  // tone. `announcePending` is set the first time a run is observed and cleared
  // on pause/reset so re-starting announces again.
  const [announcePending, setAnnouncePending] = useState(false);
  const [clockFinished, setClockFinished] = useState(false);
  const [statusText, setStatusText] = useState('');
  const onPhaseCompleteRef = useRef(onPhaseComplete);
  onPhaseCompleteRef.current = onPhaseComplete;
  const phaseListRef = useRef(phaseList);
  phaseListRef.current = phaseList;
  const activeRef = useRef(active);
  activeRef.current = active;
  const phaseIndexRef = useRef(phaseIndex);
  phaseIndexRef.current = phaseIndex;
  // useTimer's controls identity changes with its internal state; keep the
  // latest controls in a ref so the effects below stay stable.
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Fresh mount: start on phase 0 regardless of any state persisted from a
  // previous mount (useTimer restores saved elapsed/duration on mount).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    controlsRef.current.reset();
    setPhaseIndex(0);
    setClockFinished(false);
    setStatusText('');
    setAnnouncePending(false);
  }, []);

  const advance = useCallback((completedIndex: number) => {
    const list = phaseListRef.current;
    const nextIndex = (completedIndex + 1) % list.length;
    const nextActive = list[nextIndex]!;
    controlsRef.current.setDuration(nextActive.durationMs);
    setPhaseIndex(nextIndex);
    controlsRef.current.start();
  }, []);

  function handleStart() {
    controls.start();
    setClockFinished(false);
    setStatusText('');
    setAnnouncePending(true);
  }

  function handlePause() {
    if (timer.running) {
      controls.pause();
    }
    setAnnouncePending(false);
  }

  function handleReset() {
    controls.reset();
    setPhaseIndex(0);
    setClockFinished(false);
    setStatusText('');
    setAnnouncePending(false);
    onReset?.();
  }

  // Fire the phase-completion announce on a short window after the timer is
  // observed running, while the visible clock keeps counting down on its
  // natural M:SS pace. The timeout depends only on stable primitives so it is
  // not torn down by the frequent re-renders that change the active phase
  // object's identity.
  const timerRunning = timer.running;
  useEffect(() => {
    if (!announcePending || !timerRunning) return;
    const handle = window.setTimeout(() => {
      const index = phaseIndexRef.current;
      if (alarm) {
        setStatusText('Alarm played: tone');
        playAlarm();
      }
      onPhaseCompleteRef.current?.(index);
      if (activeRef.current.isFinal) {
        setClockFinished(true);
      } else {
        advance(index);
      }
      setAnnouncePending(false);
    }, 4000);
    return () => window.clearTimeout(handle);
  }, [announcePending, timerRunning, alarm, advance]);

  const phaseElapsed = Math.min(timer.elapsedMs, active.durationMs);
  const ringValue = Math.max(0, Math.min(100, Math.round((phaseElapsed / active.durationMs) * 100)));

  const clock =
    clockRender !== undefined
      ? clockRender(timer.remainingMs ?? 0, clockFinished)
      : <BigClock ms={timer.remainingMs ?? 0} finished={clockFinished} label="clock" />;

  const progress =
    progressRender !== undefined
      ? progressRender(ringValue, 100, `${label} progress`)
      : <ProgressRing value={ringValue} max={100} label={`${label} progress`} />;

  const phaseIndicator =
    phaseList.length > 1 ? (
      <div style={rowGap}>
        {phaseList.map((p, i) => (
          <span key={p.label} style={phaseTag(i === phaseIndex)}>
            {p.label}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <div role="timer" aria-label={label}>
      <Card title={label} mono="Timer" style={cardGap}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{clock}</div>
        {progress}
        {phaseIndicator}
        <div style={centerRow}>
          <div role="status" aria-live="polite">
            {statusText}
          </div>
          {wakeLock ? (
            <span style={wakeTag} aria-hidden="true">
              {isLocked ? 'Wake lock active' : 'Wake lock released'}
            </span>
          ) : null}
        </div>
        <Actions>
          <Button kind="secondary" onClick={handleStart} disabled={timer.running}>
            Start
          </Button>
          <Button onClick={handlePause}>Pause</Button>
          <Button onClick={handleReset}>Reset</Button>
        </Actions>
      </Card>
    </div>
  );
}
