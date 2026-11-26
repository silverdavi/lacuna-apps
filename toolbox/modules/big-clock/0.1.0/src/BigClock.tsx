// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/big-clock 0.1.0: snapshot of lacuna-components BigClock at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import type { CSSProperties } from 'react';
import { toParts } from '@lacuna/format-duration';

export interface BigClockProps {
  /** Time to display in milliseconds. */
  ms: number;
  /** If true, show milliseconds (two digits) after the seconds. Defaults to false. */
  showMs?: boolean;
  /** If true, display in countdown style (remaining time). If false, display as elapsed. Defaults to true. */
  countdown?: boolean;
  /** Accessible label for the time display. Defaults to 'Time display'. */
  label?: string;
  /** If true, the clock is in a "finished" state (e.g. countdown reached zero) and shows a distinct style. Defaults to false. */
  finished?: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function format(ms: number, showMs: boolean): string {
  const { hours, minutes, seconds } = toParts(ms);
  const body =
    hours > 0
      ? `${hours}:${pad(minutes)}:${pad(seconds)}`
      : `${minutes}:${pad(seconds)}`;
  if (!showMs) return body;
  const fractionMs = ms % 1000;
  let centiseconds = Math.round(fractionMs / 10);
  let totalSeconds = hours * 3600 + minutes * 60 + seconds;
  if (centiseconds >= 100) {
    centiseconds -= 100;
    totalSeconds += 1;
  }
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const carried =
    h > 0
      ? `${h}:${pad(m)}:${pad(s)}`
      : `${m}:${pad(s)}`;
  return `${carried}.${pad(centiseconds)}`;
}

const containerStyle = (finished: boolean): CSSProperties => ({
  display: 'inline-flex',
  padding: 'calc(8px * var(--sf))',
  borderWidth: 'calc(1px * var(--sf))',
  borderStyle: 'solid',
  borderColor: finished ? 'var(--danger)' : 'var(--hair)',
  borderRadius: 'calc(4px * var(--sf))',
  background: 'var(--paper-deep)',
});

const timeStyle = (finished: boolean): CSSProperties => ({
  color: finished ? 'var(--danger)' : 'var(--ink)',
  fontFamily: 'var(--mono)',
  fontSize: 'calc(40px * var(--tf))',
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums',
});

export function BigClock(props: BigClockProps) {
  const { ms, showMs = false, countdown = true, label = 'Time display', finished = false } = props;
  const text = format(ms, showMs);

  return (
    <div
      role="timer"
      aria-label={label}
      tabIndex={0}
      data-countdown={countdown}
      className={finished ? 'big-clock big-clock--finished' : 'big-clock'}
      style={containerStyle(finished)}
    >
      <time style={timeStyle(finished)}>{text}</time>
    </div>
  );
}
