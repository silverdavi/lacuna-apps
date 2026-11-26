<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components toneSynth at 6188248. -->

> `@lacuna/tone-synth` `0.1.0`. To use it in an app: add `"@lacuna/tone-synth": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/tone-synth": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/tone-synth'`.

# toneSynth

Pure functions for scheduling Web Audio tones, clicks, and notes with sample-accurate timing. Drum machines, tuners, pianos, soundboards, and timers can generate sound with them without any React or DOM dependency; the caller owns the `AudioContext` and the nodes that are returned.

## Signature

```ts
export interface ToneOptions {
  /** Frequency in Hz (default 440) */
  freq?: number;
  /** Duration in seconds (default 0.1) */
  duration?: number;
  /** Gain from 0 to 1 (default 0.5) */
  gain?: number;
  /** Waveform type (default 'sine') */
  type?: OscillatorType;
  /** Time offset in seconds from now (default 0) */
  offset?: number;
}

export interface ClickOptions {
  /** Duration in seconds (default 0.02) */
  duration?: number;
  /** Gain from 0 to 1 (default 0.8) */
  gain?: number;
  /** Time offset in seconds from now (default 0) */
  offset?: number;
}

export interface NoteOptions {
  /** MIDI note number, 0–127 */
  midi: number;
  /** Duration in seconds (default 0.5) */
  duration?: number;
  /** Gain from 0 to 1 (default 0.5) */
  gain?: number;
  /** Time offset in seconds from now (default 0) */
  offset?: number;
}

/** Convert a MIDI note number to frequency in Hz */
export function midiToFreq(midi: number): number;

/** Schedule a tone on an AudioContext; returns the OscillatorNode */
export function scheduleTone(ctx: AudioContext, opts?: ToneOptions): OscillatorNode;

/** Schedule a click (short noise burst) on an AudioContext; returns the BufferSourceNode */
export function scheduleClick(ctx: AudioContext, opts?: ClickOptions): BufferSourceNode;

/** Schedule a note (MIDI number) on an AudioContext; returns the OscillatorNode */
export function scheduleNote(ctx: AudioContext, opts: NoteOptions): OscillatorNode;

/** Create a short noise buffer for click sounds */
export function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer;
```

## Usage

```tsx
import { midiToFreq, scheduleTone, scheduleClick, scheduleNote, createNoiseBuffer } from '@lacuna/tone-synth';

const ctx: AudioContext = new AudioContext();

// A4 is 440 Hz; out-of-range MIDI numbers yield NaN.
const a4 = midiToFreq(69);

// A 100 ms sine tone at 440 Hz, starting in 50 ms.
const osc = scheduleTone(ctx, { freq: 440, duration: 0.1, gain: 0.5, type: 'sine', offset: 0.05 });

// A 20 ms noise click.
const click = scheduleClick(ctx, { duration: 0.02, gain: 0.8 });

// A note from its MIDI number (C4).
const note = scheduleNote(ctx, { midi: 60, duration: 0.5 });

// A reusable mono noise buffer.
const noise = createNoiseBuffer(ctx, 0.02);

console.log(a4, osc, click, note, noise);
```
