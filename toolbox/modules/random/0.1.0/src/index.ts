// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/random 0.1.0: snapshot of lacuna-components random at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export type Rng = () => number;

function mulberry32State(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mulberry32(seed: number): Rng {
  return mulberry32State(seed);
}

export function randomInt(rng: Rng, min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi < lo) throw new RangeError(`randomInt: max (${max}) < min (${min})`);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function randomFloat(rng: Rng, min: number, max: number): number {
  if (max < min) throw new RangeError(`randomFloat: max (${max}) < min (${min})`);
  return min + rng() * (max - min);
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

export function weightedPick<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T {
  if (weights.length !== items.length) {
    throw new RangeError('weightedPick: weights.length must equal items.length');
  }
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) throw new RangeError('weightedPick: total weight must be positive');
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    const w = weights[i];
    if (w === undefined) continue;
    r -= w;
    if (r < 0) {
      const item = items[i];
      if (item === undefined) throw new RangeError('weightedPick: item missing');
      return item;
    }
  }
  const last = items[items.length - 1];
  if (last === undefined) throw new RangeError('weightedPick: items empty');
  return last;
}

const DICE_PATTERN = /^(\d+)d(\d+)$/;

export function parseDiceNotation(
  notation: string,
  rng: Rng
): { count: number; sides: number; rolls: number[]; total: number } {
  const match = DICE_PATTERN.exec(notation);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new SyntaxError(`parseDiceNotation: invalid notation "${notation}"`);
  }
  const count = Number(match[1]);
  const sides = Number(match[2]);
  if (count < 1 || sides < 2) {
    throw new SyntaxError(`parseDiceNotation: invalid notation "${notation}"`);
  }
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const roll = randomInt(rng, 1, sides);
    rolls.push(roll);
    total += roll;
  }
  return { count, sides, rolls, total };
}

export function cryptoRng(): Rng {
  const bytes = new Uint32Array(1);
  return () => {
    crypto.getRandomValues(bytes);
    return (bytes[0] ?? 0) / 4294967296;
  };
}
