<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components DrawCanvas at 9c7f3ab. -->

> `@lacuna/draw-canvas` `0.1.0`. To use it in an app: add `"@lacuna/draw-canvas": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/draw-canvas": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/draw-canvas'`.

# DrawCanvas

A canvas-based drawing surface. Supports freehand brush and eraser, basic shapes (rectangle, ellipse, line), multiple named layers, pan/zoom, undo/redo, and PNG export.

Built on `@lacuna/use-pointer-draw` (pointer + transform) and `@lacuna/use-undo-stack` (history).

## Usage

```tsx
import { DrawCanvas } from '@lacuna/draw-canvas'

function App() {
  return (
    <DrawCanvas
      width={400}
      height={280}
      initialLayers={['Base', 'Detail']}
      onExport={(dataUrl) => console.log(dataUrl)}
    />
  )
}
```

## Props

- `width` / `height`: canvas size in logical pixels (defaults 400 / 300).
- `onExport`: called with a `data:image/png;base64,…` string after export.
- `onCommit`: called with a composited PNG data-URL after each committed stroke/shape.
- `initialLayers`: initial layer names (default `['Layer 1']`).

## Behavior

- **Brush / Eraser**: freehand strokes; the eraser removes pixels on the active layer.
- **Rectangle / Ellipse / Line**: press-drag-release to draw a filled/stroked shape.
- **Pan**: drag in pan mode to offset the view. **Zoom In / Zoom Out**: scale the view.
- **Undo / Redo**: history per committed action; buttons reflect availability via `aria-disabled`.
- **Export PNG**: composites all layers into a single PNG data-URL.
