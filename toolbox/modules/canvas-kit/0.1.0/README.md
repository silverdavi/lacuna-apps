<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components CanvasKit at d422a73. -->

> `@lacuna/canvas-kit` `0.1.0`. To use it in an app: add `"@lacuna/canvas-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/canvas-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/canvas-kit'`.

# CanvasKit

A drawing kit that hosts a freehand canvas together with a tool `Toolbar`
(Brush, Eraser, Shape, Undo), a color palette of toggle swatches, a `RangeSlider`
for the brush size, an optional layers readout, optional zoom controls, and an
`ExportMenu` that downloads the current surface as a PNG. Stroke history is kept in
a `useUndoStack`, and the pointer surface uses `usePointerDraw`'s `Point`/`Stroke`
types. The component is fully keyboard operable: Tab reaches the first tool, arrow
keys move between swatches, and the slider supports standard `aria-valuenow` range
semantics.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `swatches` | `Array<{ name: string; color: string }>` | three token swatches | Colors offered by the palette. |
| `showLayers` | `boolean` | `false` | Render the layers readout. |
| `showZoom` | `boolean` | `false` | Render the zoom in/out controls. |
| `defaultBrushSize` | `number` | `5` | Initial brush size, clamped to `1..100`. |
| `onCommit` | `(strokes: Stroke[]) => void` | — | Called after each committed stroke or shape. |

The palette swatches are labelled `Color #1`, `Color #2`, and so on; the active
swatch reports `aria-pressed="true"`. The slider exposes `role="slider"` with the
label `Brush size` and a range of `1` to `100`.

## Usage

```tsx
import { CanvasKit } from '@lacuna/canvas-kit'

export function Example() {
  return (
    <CanvasKit
      showLayers
      showZoom
      defaultBrushSize={5}
      swatches={[
        { name: 'Ink', color: 'var(--ink)' },
        { name: 'Accent', color: 'var(--accent)' },
      ]}
    />
  )
}
```
