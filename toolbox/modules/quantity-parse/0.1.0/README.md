<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components quantityParse at d422a73. -->

> `@lacuna/quantity-parse` `0.1.0`. To use it in an app: add `"@lacuna/quantity-parse": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/quantity-parse": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/quantity-parse'`.

# quantityParse

Pure functions to parse, normalize, and scale quantities expressed as whole numbers, decimals, fractions, or mixed numbers (e.g. "1 1/2 cups", "3/4", "2.5"). `parseQuantity` reads a string into a numeric value with an optional unit, `scaleQuantity` and `addQuantities` perform arithmetic on parsed quantities, `toFractionString` renders a number back into a human-readable fraction, and `isValidQuantity` reports whether a string would parse. Unit conversion, scientific notation, and negative quantities are out of scope.

## Signature

```ts
export interface ParsedQuantity {
  value: number;
  unit: string;
  raw: string;
}

export function parseQuantity(input: string): ParsedQuantity;
export function scaleQuantity(qty: ParsedQuantity, factor: number): ParsedQuantity;
export function addQuantities(a: ParsedQuantity, b: ParsedQuantity): ParsedQuantity;
export function toFractionString(value: number, maxDenominator?: number): string;
export function isValidQuantity(input: string): boolean;
```

## Usage

```tsx
import { parseQuantity, scaleQuantity, addQuantities, toFractionString } from '@lacuna/quantity-parse';

const half = parseQuantity('1 1/2 cups');
const doubled = scaleQuantity(half, 2);
const total = addQuantities(half, parseQuantity('0.5 cup'));
const label = toFractionString(doubled.value);
console.log(half, doubled.value, total.value, label);
```
