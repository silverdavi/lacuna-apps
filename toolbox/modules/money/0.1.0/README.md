<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components money at 9c7f3ab. -->

> `@lacuna/money` `0.1.0`. To use it in an app: add `"@lacuna/money": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/money": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/money'`.

# money

Integer minor-unit currency arithmetic that keeps monetary values exact. All amounts are stored as whole minor units (e.g. cents), so addition, subtraction, scaling, and division never drift into floating-point error. `toMinorUnits` and `fromMinorUnits` bridge decimal inputs to the integer representation, `allocate` splits a total across weighted shares with the largest-remainder method, and `format` renders any amount with `Intl` for the chosen currency and locale.

## Signature

```ts
export type MinorUnits = number; // integer, e.g. cents

export interface MoneyOptions {
  currency?: string;
  locale?: string;
}

export function toMinorUnits(major: number, currency?: string): MinorUnits;
export function fromMinorUnits(minor: MinorUnits, currency?: string): number;
export function add(a: MinorUnits, b: MinorUnits): MinorUnits;
export function sub(a: MinorUnits, b: MinorUnits): MinorUnits;
export function mul(a: MinorUnits, b: number): MinorUnits;
export function div(a: MinorUnits, b: number): MinorUnits;
export function roundMinor(minor: MinorUnits, mode?: 'half-up' | 'half-even' | 'truncate'): MinorUnits;
export function allocate(total: MinorUnits, parts: readonly number[]): MinorUnits[];
export function format(minor: MinorUnits, options?: MoneyOptions): string;
```

## Usage

```tsx
import { toMinorUnits, add, fromMinorUnits, format, allocate } from '@lacuna/money';

const lineA = toMinorUnits(19.99);
const lineB = toMinorUnits(4.5);
const total = add(lineA, lineB);
const shares = allocate(total, [2, 1]);
console.log(format(total), format(shares[0] ?? 0), fromMinorUnits(total));
```
