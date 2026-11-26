<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components codecs at d422a73. -->

> `@lacuna/codecs` `0.1.0`. To use it in an app: add `"@lacuna/codecs": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/codecs": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/codecs'`.

# codecs

Pure encode/decode functions for Base64, URL encoding, hexadecimal, arbitrary number-base conversion, and Roman numerals. All functions operate on UTF-8 strings; no DOM, no dependencies. Use it in encoding, conversion, and decoding tools that need to transform text or numbers without a runtime.

## Signature

```ts
export function base64Encode(input: string): string;
export function base64Decode(input: string): string;
export function urlEncode(input: string): string;
export function urlDecode(input: string): string;
export function toHex(input: string): string;
export function fromHex(input: string): string;
export function toBase(input: number, base: number): string;
export function fromBase(input: string, base: number): number;
export function toRoman(input: number): string;
export function fromRoman(input: string): number;
```

`toBase` and `fromBase` accept bases 2–36 and throw for anything outside that range. `toRoman` and `fromRoman` accept values 1–3999 and throw for out-of-range or invalid input.

## Usage

```tsx
import { base64Encode, base64Decode, toBase, fromBase, toRoman, fromRoman } from '@lacuna/codecs';

const encoded = base64Encode('hello');
const decoded = base64Decode(encoded);
const hex = toBase(255, 16);
const back = fromBase(hex, 16);
const roman = toRoman(1994);
const year = fromRoman(roman);
console.log(decoded, back, year);
```
