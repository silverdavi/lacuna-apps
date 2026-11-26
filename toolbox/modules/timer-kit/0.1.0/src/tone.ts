// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/timer-kit 0.1.0: snapshot of lacuna-components TimerKit at 971986c by sync-toolbox-components.py; a change gets a new version.
export type ToneFn = () => void;

const defaultTone: ToneFn = () => {
  try {
    if (typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Audio is unavailable in this environment; the alarm is a no-op.
  }
};

let toneFn: ToneFn = defaultTone;

export function setTone(fn: ToneFn): void {
  toneFn = fn;
}

export function resetTone(): void {
  toneFn = defaultTone;
}

export function playAlarm(): void {
  toneFn();
}
