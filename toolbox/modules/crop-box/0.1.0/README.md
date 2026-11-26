<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components CropBox at 6188248. -->

> `@lacuna/crop-box` `0.1.0`. To use it in an app: add `"@lacuna/crop-box": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/crop-box": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/crop-box'`.

# CropBox

Renders a resizable and draggable crop rectangle over an image area. The crop box is a keyboard-focusable region (`role="slider"`, label "Crop rectangle") that can be moved with the arrow keys and resized with its four corner handles. An optional aspect-ratio lock keeps width/height fixed while resizing or moving via Shift+arrows.

## Props

- `imageWidth`, `imageHeight` (number): size of the image in pixels; the crop box is positioned proportionally inside its container.
- `crop` (`{ x, y, width, height }`): current crop rectangle in image pixels.
- `onCropChange` (callback): called with the new crop rectangle when the user moves or resizes.
- `aspectRatio?` (number): when set, the crop width/height ratio is locked.
- `minSize?` (number, default 10): minimum crop dimension in pixels.
- `label?` (string, default "CropBox"): accessible name of the crop region group.

The crop rectangle moves 1 px per arrow key press, clamped to the image boundary; Shift+arrows also move 1 px but keep the aspect ratio.

## Usage

```tsx
import { useState } from 'react'
import { CropBox } from '@lacuna/crop-box'

export function Example() {
  const [crop, setCrop] = useState({ x: 50, y: 50, width: 200, height: 150 })
  return (
    <div style={{ position: 'relative', width: 'calc(400px * var(--sf))', height: 'calc(300px * var(--sf))' }}>
      <CropBox imageWidth={400} imageHeight={300} crop={crop} onCropChange={setCrop} />
    </div>
  )
}
```
