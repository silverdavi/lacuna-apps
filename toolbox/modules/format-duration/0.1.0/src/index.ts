// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/format-duration 0.1.0: snapshot of lacuna-components formatDuration at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
// Includes logic adapted from the open-source project credited in NOTICE.md, under its licence.
export interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

function clamp(ms: number): number {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return 0;
  return ms;
}

export function toParts(ms: number): DurationParts {
  const total = clamp(ms);
  const secondsTotal = Math.floor(total / 1000);
  return {
    hours: Math.floor(secondsTotal / 3600),
    minutes: Math.floor(secondsTotal / 60) % 60,
    seconds: secondsTotal % 60,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDuration(ms: number): string {
  const { hours, minutes, seconds } = toParts(ms);
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

export function humanizeDuration(ms: number): string {
  const { hours, minutes, seconds } = toParts(ms);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

const TOKEN = /^(\d+)\s*([hms])$/;

export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '') return 0;
  let total = 0;
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    const match = TOKEN.exec(token);
    if (match === null) throw new Error(`Invalid duration token: ${token}`);
    const value = Number(match[1]);
    const unit = match[2];
    if (unit === 'h') total += value * 3600000;
    else if (unit === 'm') total += value * 60000;
    else total += value * 1000;
  }
  return total;
}
