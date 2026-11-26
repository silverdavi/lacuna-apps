// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/tone-synth 0.1.0: snapshot of lacuna-components toneSynth at 6188248 by sync-toolbox-components.py; a change gets a new version.
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

/**
 * Convert a MIDI note number to frequency in Hz.
 *
 * Uses the standard formula A4 (MIDI 69) = 440 Hz. Returns NaN for MIDI
 * numbers outside the valid 0–127 range, including non-integers and NaN.
 */
export function midiToFreq(midi: number): number {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    return NaN;
  }
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function applyGain(gainParam: GainNode['gain'], gain: number): void {
  gainParam.value = gain;
}

function clampGain(gain: number | undefined): number {
  if (typeof gain !== 'number' || Number.isNaN(gain)) return 0.5;
  return Math.min(1, Math.max(0, gain));
}

function clampPositive(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return fallback;
  return value;
}

/**
 * Schedule a tone on an AudioContext and return the created OscillatorNode.
 *
 * The oscillator is wired to a gain node (simple attack/release ramp) that is
 * connected to the context destination. The caller owns the AudioContext and
 * is responsible for starting and stopping the returned node.
 */
export function scheduleTone(ctx: AudioContext, opts?: ToneOptions): OscillatorNode {
  const freq = clampPositive(opts?.freq, 440);
  const duration = clampPositive(opts?.duration, 0.1);
  const gain = clampGain(opts?.gain);
  const type = opts?.type ?? 'sine';
  const offset = clampPositive(opts?.offset, 0);

  const now = ctx.currentTime;
  const start = now + offset;
  const stop = start + duration;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const g = ctx.createGain();
  applyGain(g.gain, gain);

  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(stop);
  return osc;
}

/**
 * Create a mono noise buffer of the given duration for click sounds.
 *
 * Each sample is a uniformly distributed random value in `[-1, 1]`. The
 * returned buffer length is quantized to whole frames by the AudioContext.
 */
export function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const frames = Math.max(1, Math.round(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Schedule a click (short noise burst) on an AudioContext and return the
 * created BufferSourceNode.
 */
export function scheduleClick(ctx: AudioContext, opts?: ClickOptions): AudioBufferSourceNode {
  const duration = clampPositive(opts?.duration, 0.02);
  const gain = clampGain(opts?.gain);
  const offset = clampPositive(opts?.offset, 0);

  const now = ctx.currentTime;
  const start = now + offset;
  const stop = start + duration;

  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, duration);

  const g = ctx.createGain();
  applyGain(g.gain, gain);

  source.connect(g);
  g.connect(ctx.destination);
  source.start(start);
  source.stop(stop);
  return source;
}

/**
 * Schedule a note (MIDI number) on an AudioContext and return the created
 * OscillatorNode. The frequency is derived from `opts.midi` via midiToFreq.
 */
export function scheduleNote(ctx: AudioContext, opts: NoteOptions): OscillatorNode {
  const freq = midiToFreq(opts.midi);
  return scheduleTone(ctx, {
    freq: Number.isNaN(freq) ? 440 : freq,
    duration: opts.duration,
    gain: opts.gain,
    offset: opts.offset,
  });
}
