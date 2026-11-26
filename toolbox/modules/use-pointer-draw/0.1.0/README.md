<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components usePointerDraw at 9c7f3ab. -->

> `@lacuna/use-pointer-draw` `0.1.0`. To use it in an app: add `"@lacuna/use-pointer-draw": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-pointer-draw": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-pointer-draw'`.

# usePointerDraw

A React hook that captures pointer events on a surface element and turns them into smoothed, pressure-aware freehand strokes, plus a pan-and-zoom transform for the surface. It enforces a minimum distance between recorded points, applies a configurable smoothing factor, clamps the zoom to a min/max scale, and reports progress through `onPoint`, `onStrokeEnd`, and `onTransform` callbacks. Made for sketch pads, whiteboards, and annotation tools that render freehand paths on a canvas or SVG.

## Signature

```ts
export interface Point { x: number; y: number; pressure: number; }
export interface Stroke { points: Point[]; color: string; width: number; }
export interface Transform { x: number; y: number; scale: number; }

export interface PointerDrawOptions {
  /** Base stroke width in CSS px. Default 2. */
  strokeWidth?: number;
  /** Smoothing factor 0–1 (0 = raw, 1 = max smoothing). Default 0.5. */
  smoothing?: number;
  /** Minimum distance between recorded points, in CSS px. Default 2. */
  minDistance?: number;
  /** Zoom limits. Default { min: 0.1, max: 10 }. */
  zoomLimits?: { min: number; max: number };
  /** Called on every new stroke point (for live rendering). */
  onPoint?: (point: Point, stroke: Stroke) => void;
  /** Called when a stroke is completed. */
  onStrokeEnd?: (stroke: Stroke) => void;
  /** Called when the transform changes (pan or zoom). */
  onTransform?: (t: Transform) => void;
}

export interface PointerDrawReturn {
  /** Attach to the drawing surface element. */
  surfaceProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    style: React.CSSProperties;
  };
  /** Current transform (pan offset + zoom scale). */
  transform: Transform;
  /** All completed strokes. */
  strokes: Stroke[];
  /** The stroke currently being drawn, or null. */
  activeStroke: Stroke | null;
  /** True while a pointer is down and drawing. */
  isDrawing: boolean;
  /** Clear all strokes. */
  clear: () => void;
  /** Reset transform to identity. */
  resetTransform: () => void;
  /** Set the current stroke color (applies to next stroke). */
  setColor: (color: string) => void;
  /** Set the current stroke width (applies to next stroke). */
  setWidth: (width: number) => void;
}

export function usePointerDraw(options?: PointerDrawOptions): PointerDrawReturn;
```

## Usage

```tsx
import { usePointerDraw } from '@lacuna/use-pointer-draw';

export function SketchPad() {
  const { surfaceProps, strokes, isDrawing } = usePointerDraw({
    onStrokeEnd: (stroke) => console.log('finished', stroke.points.length),
  });

  return (
    <div style={{ position: 'relative' }}>
      <div
        tabIndex={0}
        style={{ ...surfaceProps.style, width: '100%', height: '100%' }}
        onPointerDown={surfaceProps.onPointerDown}
        onPointerMove={surfaceProps.onPointerMove}
        onPointerUp={surfaceProps.onPointerUp}
        onPointerLeave={surfaceProps.onPointerLeave}
        onWheel={surfaceProps.onWheel}
      />
      <p>{isDrawing ? 'drawing…' : `${strokes.length} strokes`}</p>
    </div>
  );
}
```
