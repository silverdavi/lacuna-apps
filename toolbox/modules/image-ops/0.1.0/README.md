<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components imageOps at 9c7f3ab. -->

> `@lacuna/image-ops` `0.1.0`. To use it in an app: add `"@lacuna/image-ops": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/image-ops": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/image-ops'`.

# imageOps

Pure functions for canvas-based image manipulation: resize, crop, rotate, flip, CSS-like filters, and re-encoding a canvas to a target format with quality control. Use it in image editing, conversion, and compression tools that operate on `HTMLCanvasElement` or `ImageData` without a UI layer.

## Signature

```ts
export interface CropRect { x: number; y: number; width: number; height: number; }
export interface FilterParams {
  brightness?: number;   // 1 = normal, 0 = black, 2 = double
  contrast?: number;     // 1 = normal
  saturate?: number;     // 1 = normal, 0 = grayscale
  hueRotate?: number;    // degrees
  blur?: number;         // px
  grayscale?: number;    // 0-1
  sepia?: number;        // 0-1
}
export interface EncodeOptions {
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;      // 0-1, ignored for PNG
}

export function resizeImageData(src: ImageData, width: number, height: number): ImageData;
export function cropImageData(src: ImageData, rect: CropRect): ImageData;
export function rotateImageData(src: ImageData, degrees: 90 | 180 | 270): ImageData;
export function flipImageData(src: ImageData, axis: 'horizontal' | 'vertical'): ImageData;
export function applyFilter(src: ImageData, params: FilterParams): ImageData;
export function encodeCanvas(canvas: HTMLCanvasElement, options: EncodeOptions): Promise<Blob>;
```

## Usage

```tsx
import { resizeImageData, cropImageData, rotateImageData, flipImageData, applyFilter, encodeCanvas } from '@lacuna/image-ops';

const canvas = document.createElement('canvas');
canvas.width = 4;
canvas.height = 4;
const ctx = canvas.getContext('2d');
if (ctx) {
  const src = ctx.createImageData(4, 4);
  const small = resizeImageData(src, 2, 2);
  const quarter = cropImageData(src, { x: 0, y: 0, width: 2, height: 2 });
  const turned = rotateImageData(quarter, 90);
  const mirrored = flipImageData(turned, 'horizontal');
  const faded = applyFilter(mirrored, { brightness: 0.8, grayscale: 0.5 });
  console.log(small.width, quarter.width, turned.width, mirrored.width, faded.data.length);
  encodeCanvas(canvas, { format: 'image/png' }).then((blob) => console.log(blob.type));
}
```
