<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components colorMath at 9c7f3ab. -->

> `@lacuna/color-math` `0.1.0`. To use it in an app: add `"@lacuna/color-math": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/color-math": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/color-math'`.

# colorMath

Pure functions for converting between hex, RGB, HSL, and OKLCH color spaces, computing WCAG contrast ratios, and generating palettes and gradients. Use it in drawing, editing, and design tools that need to manipulate or display color values without a DOM.

## Signature

```ts
export interface RGB { r: number; g: number; b: number; }
export interface HSL { h: number; s: number; l: number; }
export interface OKLCH { l: number; c: number; h: number; }

export function hexToRgb(hex: string): RGB;
export function rgbToHex(rgb: RGB): string;
export function rgbToHsl(rgb: RGB): HSL;
export function hslToRgb(hsl: HSL): RGB;
export function rgbToOklch(rgb: RGB): OKLCH;
export function oklchToRgb(oklch: OKLCH): RGB;
export function relativeLuminance(rgb: RGB): number;
export function contrastRatio(fg: RGB, bg: RGB): number;
export function meetsWcagAA(fg: RGB, bg: RGB, largeText?: boolean): boolean;
export function generatePalette(base: RGB, count: number, type: 'analogous' | 'complementary' | 'triadic'): RGB[];
export function generateGradient(stops: RGB[], steps: number): RGB[];
```

## Usage

```tsx
import { hexToRgb, rgbToHex, contrastRatio, meetsWcagAA, generatePalette, generateGradient } from '@lacuna/color-math';

const red = hexToRgb('#ff0000');
const hex = rgbToHex(red);
const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
const ok = meetsWcagAA({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
const palette = generatePalette(red, 5, 'analogous');
const gradient = generateGradient([{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }], 3);
console.log(hex, ratio, ok, palette.length, gradient.length);
```
