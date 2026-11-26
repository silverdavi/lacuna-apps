<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components random at 9c7f3ab. -->

> `@lacuna/random` `0.1.0`. To use it in an app: add `"@lacuna/random": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/random": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/random'`.

# random

Seedable pseudo-random number generator with utilities for shuffling, weighted selection, and dice notation parsing, plus an optional crypto-strength path. Use it anywhere you need reproducible (seeded) or statistically sound (crypto) randomness, from game engines to quiz shufflers.

## Signature

```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng;
export function randomInt(rng: Rng, min: number, max: number): number;
export function randomFloat(rng: Rng, min: number, max: number): number;
export function shuffle<T>(rng: Rng, items: readonly T[]): T[];
export function weightedPick<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T;
export function parseDiceNotation(
  notation: string,
  rng: Rng,
): { count: number; sides: number; rolls: number[]; total: number };
export function cryptoRng(): Rng;
```

## Usage

```tsx
import { mulberry32, randomInt, shuffle, weightedPick, parseDiceNotation } from '@lacuna/random';

const rng = mulberry32(42);
const roll = randomInt(rng, 1, 6);
const order = shuffle(rng, ['a', 'b', 'c']);
const pick = weightedPick(rng, ['x', 'y'], [3, 1]);
const dice = parseDiceNotation('2d6', rng);
console.log(roll, order, pick, dice.total);
```
